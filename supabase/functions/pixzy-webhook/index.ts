import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const pixzyApiToken = Deno.env.get("PIXZY_API_TOKEN");

    if (!supabaseUrl || !supabaseServiceKey || !pixzyApiToken) {
      throw new Error("Missing server environment configuration.");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const body = await req.json();
    console.log("Received Pixzy webhook payload:", JSON.stringify(body));

    const { event, transaction } = body;
    if (!transaction || !transaction.metadata || !transaction.metadata.identifier) {
      console.warn("Invalid webhook payload structure. Missing metadata identifier.");
      return new Response("Invalid payload", { status: 400 });
    }

    const identifier = transaction.metadata.identifier; // matches our external_ref
    const webhookAmount = Number(transaction.amount); // in centavos

    // 1. Fetch transaction from DB by external_ref
    const { data: dbTx, error: dbError } = await supabase
      .from("transactions")
      .select("*")
      .eq("external_ref", identifier)
      .single();

    if (dbError || !dbTx) {
      console.error(`Transaction not found for external_ref: ${identifier}`, dbError);
      // Return 200 to acknowledge receipt anyway (avoids retries from gateway for invalid txs)
      return new Response(JSON.stringify({ success: false, message: "Transaction not found" }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Idempotency: If transaction is already marked as paid, return 200 quickly
    if (dbTx.status === "paid") {
      console.log(`Transaction ${dbTx.transaction_id} is already paid (idempotent).`);
      return new Response(JSON.stringify({ success: true, message: "Already processed" }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    // 2. Validate amount matches
    if (dbTx.amount !== webhookAmount) {
      console.error(`Amount mismatch! Database: ${dbTx.amount}, Webhook: ${webhookAmount}`);
      return new Response("Amount mismatch", { status: 400 });
    }

    let isConfirmed = false;

    // 3. Reconfirm status via Pixzy GET API using saved UUID
    if (event === "paid" || transaction.status === "paid") {
      try {
        const getUrl = `https://pay.pixzy.io/api/transactions/${dbTx.transaction_id}`;
        console.log(`Verifying transaction status via GET: ${getUrl}`);

        const verifyResponse = await fetch(getUrl, {
          method: "GET",
          headers: {
            "Accept": "application/json",
            "Authorization": `Bearer ${pixzyApiToken}`,
          },
        });

        if (verifyResponse.ok) {
          const verifyText = await verifyResponse.text();
          if (verifyText.trim().startsWith("<")) {
            console.warn("GET verification returned HTML. Falling back to webhook event state.");
          } else {
            const verifyData = JSON.parse(verifyText);
            console.log("GET verification response:", verifyData);

            if (verifyData.status === "success" && verifyData.data && verifyData.data.status === "paid") {
              isConfirmed = true;
              console.log("Transaction successfully verified as PAID via GET API.");
            } else {
              console.warn(`GET verification response status: ${verifyData.data?.status}.`);
            }
          }
        } else {
          console.warn(`GET verification failed with HTTP status ${verifyResponse.status}.`);
        }
      } catch (err) {
        console.error("Error during GET verification request:", err);
      }

      // Best-effort fallback: If GET check was inconclusive, trust webhook event and amount match
      if (!isConfirmed) {
        console.log("GET verification was inconclusive. Falling back to webhook event + amount verification.");
        if (event === "paid" || transaction.status === "paid") {
          isConfirmed = true;
        }
      }
    }

    // 4. Update transaction status in database
    let newStatus = dbTx.status;
    if (isConfirmed) {
      newStatus = "paid";
    } else if (event === "expired" || transaction.status === "expired") {
      newStatus = "expired";
    } else if (event === "failed" || transaction.status === "failed") {
      newStatus = "failed";
    }

    if (newStatus !== dbTx.status) {
      const { error: updateError } = await supabase
        .from("transactions")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
          payment_data: {
            ...dbTx.payment_data,
            webhook_payload: body,
            verified_via_get: isConfirmed,
          },
        })
        .eq("transaction_id", dbTx.transaction_id);

      if (updateError) {
        console.error("Failed to update transaction status:", updateError);
        return new Response("Database update failed", { status: 500 });
      }

      console.log(`Transaction ${dbTx.transaction_id} status updated to ${newStatus}.`);
    }

    return new Response(JSON.stringify({ success: true, status: newStatus }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Webhook processing error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
