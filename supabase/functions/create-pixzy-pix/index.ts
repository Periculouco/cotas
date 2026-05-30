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
    const { amount, customer } = body;

    // Retrieve token directly or fallback to env variables
    const pixzyApiToken = body.apiToken || Deno.env.get("PIXZY_API_TOKEN");

    if (!pixzyApiToken) {
      throw new Error("Missing Pixzy API Token configuration.");
    }

    if (!amount || !customer || !customer.name) {
      throw new Error("Invalid request payload. Amount and customer name are required.");
    }

    // Clean customer details
    const cleanDocument = customer.document ? customer.document.replace(/\D/g, "") : "";
    const cleanPhone = customer.phone ? customer.phone.replace(/\D/g, "") : "";

    // Generate unique identifier for tracking (e.g. ORDER-timestamp-random)
    const identifier = `ORDER-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    // Build the pure webhook URL (under 255 chars)
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "https://example.com";
    const webhookUrl = `${supabaseUrl}/functions/v1/pixzy-webhook`;

    // Call Pixzy API
    const pixzyUrl = "https://pay.pixzy.io/api/transactions";
    const pixzyPayload = {
      amount: amount, // Centavos (int)
      client_name: customer.name,
      client_email: customer.email || "contato@cotas.org",
      client_doc: cleanDocument || "00000000000",
      client_phone: cleanPhone || "00000000000",
      webhook_url: webhookUrl,
      description: "Cotas", // Top level description
      metadata: {
        identifier: identifier,
        provider: "Cotas",
        description: "Cotas", // Metadata description
      },
    };

    const response = await fetch(pixzyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json", // MANDATORY to get JSON instead of HTML
        "Authorization": `Bearer ${pixzyApiToken}`,
      },
      body: JSON.stringify(pixzyPayload),
    });

    const responseText = await response.text();

    // Check if the response starts with HTML tag
    if (responseText.trim().startsWith("<")) {
      console.error("HTML response received:", responseText);
      throw new Error("Invalid response: Pixzy API returned HTML instead of JSON. Check API token.");
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error("Failed to parse response:", responseText);
      throw new Error("Invalid response: Pixzy API returned non-JSON data.");
    }

    if (data.status !== "success" || !data.data) {
      console.error("Pixzy API returned error:", data);
      throw new Error(`Pixzy API error: ${data.message || "Unknown error"}`);
    }

    const transactionId = data.data.transaction_id; // UUID
    const externalRef = identifier;

    // Normalized Response format:
    const normalizedResponse = {
      success: true,
      pixCode: data.data.br_code,
      qrcodeBase64: "", // Pixzy does not provide Base64, frontend should generate
      transactionId: transactionId,
      externalRef: externalRef,
      gateway: "pixzy",
      expiresAt: null, // Pixzy does not return expiry date directly in create response
    };

    return new Response(JSON.stringify(normalizedResponse), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Error creating Pixzy PIX:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
