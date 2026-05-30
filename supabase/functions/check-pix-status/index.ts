import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get parameters from URL query string
    const url = new URL(req.url);
    const transactionId = url.searchParams.get("transaction_id");
    const gateway = url.searchParams.get("gateway"); // "paradise" | "pixzy"
    const externalRef = url.searchParams.get("external_ref");

    if (!transactionId || !gateway) {
      throw new Error("Missing transaction_id or gateway query parameter.");
    }

    let mappedStatus = "pending";

    // 1. If it is Paradise, call Paradise query API to check latest status
    if (gateway === "paradise") {
      const apiKey = url.searchParams.get("apiKey") || Deno.env.get("PARADISE_API_KEY");
      if (!apiKey) {
        throw new Error("Missing Paradise API Key.");
      }

      // For Paradise, external_id is either external_ref or transactionId
      const referenceId = externalRef || transactionId;
      const paradiseQueryUrl = `https://multi.paradisepags.com/api/v1/query.php?action=list_transactions&external_id=${referenceId}&api_key=${apiKey}`;
      console.log(`Querying Paradise status directly: ${paradiseQueryUrl}`);

      const response = await fetch(paradiseQueryUrl, {
        method: "GET",
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Paradise query error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log("Paradise query response:", data);

      if (Array.isArray(data) && data.length > 0) {
        const paradiseStatus = data[0].status; // paid / approved / pending / expired / canceled
        console.log(`Paradise transaction status: ${paradiseStatus}`);

        if (paradiseStatus === "paid" || paradiseStatus === "approved") {
          mappedStatus = "paid";
        } else if (paradiseStatus === "expired") {
          mappedStatus = "expired";
        } else if (paradiseStatus === "canceled") {
          mappedStatus = "canceled";
        }
      } else {
        console.warn(`No transaction found on Paradise for reference: ${referenceId}`);
      }
    } 
    // 2. If it is Pixzy, call Pixzy GET API directly to check status
    else if (gateway === "pixzy") {
      const apiToken = url.searchParams.get("apiToken") || Deno.env.get("PIXZY_API_TOKEN");
      if (!apiToken) {
        throw new Error("Missing Pixzy API Token.");
      }

      const pixzyQueryUrl = `https://pay.pixzy.io/api/transactions/${transactionId}`;
      console.log(`Querying Pixzy status directly via GET: ${pixzyQueryUrl}`);

      const response = await fetch(pixzyQueryUrl, {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "Authorization": `Bearer ${apiToken}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Pixzy query error: ${response.status} - ${errorText}`);
      }

      const responseText = await response.text();
      if (responseText.trim().startsWith("<")) {
        throw new Error("Pixzy API returned HTML instead of JSON status. Check API token.");
      }

      const data = JSON.parse(responseText);
      console.log("Pixzy query response:", data);

      if (data.status === "success" && data.data) {
        const pixzyStatus = data.data.status; // pending / paid / expired / failed
        console.log(`Pixzy transaction status: ${pixzyStatus}`);

        if (pixzyStatus === "paid") {
          mappedStatus = "paid";
        } else if (pixzyStatus === "expired") {
          mappedStatus = "expired";
        } else if (pixzyStatus === "failed") {
          mappedStatus = "failed";
        }
      } else {
        throw new Error(`Pixzy query returned unsuccessful status: ${data.status}`);
      }
    } else {
      throw new Error(`Unsupported gateway parameter: ${gateway}`);
    }

    return new Response(JSON.stringify({ success: true, status: mappedStatus }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Error checking PIX status:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
