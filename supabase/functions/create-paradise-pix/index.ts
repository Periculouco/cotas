import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get body parameters
    const body = await req.json();
    const { amount, customer, tracking } = body;

    // Retrieve token directly or fallback to env variables
    const paradiseApiKey = body.apiKey || Deno.env.get("PARADISE_API_KEY");
    const paradiseProductHash = body.productHash || Deno.env.get("PARADISE_PRODUCT_HASH");

    if (!paradiseApiKey || !paradiseProductHash) {
      throw new Error("Missing Paradise API Key or Product Hash configuration.");
    }

    if (!amount || !customer || !customer.name) {
      throw new Error("Invalid request payload. Amount and customer name are required.");
    }

    // Reference ID: Generate a unique ID (e.g. SCK-timestamp-random)
    const reference = `SCK-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    // Clean phone and document to keep digits only
    const cleanDocument = customer.document ? customer.document.replace(/\D/g, "") : "";
    const cleanPhone = customer.phone ? customer.phone.replace(/\D/g, "") : "";

    // Call Paradise API
    const paradiseUrl = "https://multi.paradisepags.com/api/v1/transaction.php";
    const paradisePayload = {
      amount: amount, // Centavos (int)
      description: "Cotas",
      reference: reference,
      productHash: paradiseProductHash,
      customer: {
        name: customer.name,
        email: customer.email || "contato@cotas.org",
        document: cleanDocument || "00000000000",
        phone: cleanPhone || "00000000000",
      },
      tracking: tracking || {},
    };

    const response = await fetch(paradiseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": paradiseApiKey,
      },
      body: JSON.stringify(paradisePayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Paradise API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    // Paradise returns: { transaction_id, id, qr_code, qr_code_base64, expires_at }
    const transactionId = String(data.id || data.transaction_id || reference);
    const externalRef = transactionId;

    // Normalized Response format:
    const normalizedResponse = {
      success: true,
      pixCode: data.qr_code,
      qrcodeBase64: data.qr_code_base64 || "",
      transactionId: transactionId,
      externalRef: externalRef,
      gateway: "paradise",
      expiresAt: data.expires_at || null,
    };

    return new Response(JSON.stringify(normalizedResponse), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Error creating Paradise PIX:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
