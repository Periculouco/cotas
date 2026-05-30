import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { orderPayload, apiToken } = body;

    const utmifyApiToken = apiToken || Deno.env.get("UTMIFY_API_TOKEN");

    if (!utmifyApiToken) {
      throw new Error("Missing Utmify API Token (x-api-token).");
    }

    if (!orderPayload || !orderPayload.orderId || !orderPayload.customer) {
      throw new Error("Invalid request payload. orderId and customer details are required.");
    }

    // Inject client IP if available
    const clientIp = req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0].trim();
    if (clientIp && !orderPayload.customer.ip) {
      orderPayload.customer.ip = clientIp;
    }

    console.log(`Sending order ${orderPayload.orderId} to Utmify with status: ${orderPayload.status}`);

    const response = await fetch("https://api.utmify.com.br/api-credentials/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-token": utmifyApiToken,
      },
      body: JSON.stringify(orderPayload),
    });

    const responseText = await response.text();
    console.log("Utmify API response:", responseText);

    if (!response.ok) {
      throw new Error(`Utmify API returned error: ${response.status} - ${responseText}`);
    }

    let responseData = {};
    try {
      responseData = JSON.parse(responseText);
    } catch (_) {
      responseData = { message: responseText };
    }

    return new Response(JSON.stringify({ success: true, data: responseData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Error sending order to Utmify:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
