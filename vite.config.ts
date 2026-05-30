import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Middleware to mock Deno Edge Functions locally in the Vite Dev Server
function edgeFunctionsMiddleware() {
  return {
    name: 'edge-functions-middleware',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        const url = new URL(req.url || '', `http://${req.headers.host}`);
        const pathname = url.pathname;

        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type');
        res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');

        if (req.method === 'OPTIONS') {
          res.statusCode = 200;
          res.end('ok');
          return;
        }

        const getBody = () => new Promise((resolve) => {
          let body = '';
          req.on('data', (chunk: any) => { body += chunk; });
          req.on('end', () => {
            try { resolve(JSON.parse(body)); }
            catch (e) { resolve({}); }
          });
        });

        // 1. Create Paradise PIX
        if (pathname === '/functions/v1/create-paradise-pix' && req.method === 'POST') {
          try {
            console.log("Local Vite server: Intercepted create-paradise-pix");
            const body = (await getBody()) as any;
            const { amount, customer, tracking, apiKey, productHash } = body;

            if (!apiKey || !productHash) {
              throw new Error("Missing Paradise API Key or Product Hash configuration.");
            }

            const reference = `SCK-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
            const cleanDocument = customer.document ? customer.document.replace(/\D/g, "") : "";
            const cleanPhone = customer.phone ? customer.phone.replace(/\D/g, "") : "";

            const paradiseUrl = "https://multi.paradisepags.com/api/v1/transaction.php";
            const paradisePayload = {
              amount,
              description: "Cotas",
              reference,
              productHash,
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
                "X-API-Key": apiKey,
              },
              body: JSON.stringify(paradisePayload),
            });

            const data = (await response.json()) as any;
            if (!response.ok) {
              throw new Error(`Paradise API error: ${JSON.stringify(data)}`);
            }

            const transactionId = String(data.id || data.transaction_id || reference);
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              success: true,
              pixCode: data.qr_code,
              qrcodeBase64: data.qr_code_base64 || "",
              transactionId,
              externalRef: transactionId,
              gateway: "paradise",
              expiresAt: data.expires_at || null,
            }));
          } catch (err: any) {
            console.error("Local Vite server error:", err);
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: err.message }));
          }
          return;
        }

        // 2. Create Pixzy PIX
        if (pathname === '/functions/v1/create-pixzy-pix' && req.method === 'POST') {
          try {
            console.log("Local Vite server: Intercepted create-pixzy-pix");
            const body = (await getBody()) as any;
            const { amount, customer, apiToken } = body;

            if (!apiToken) {
              throw new Error("Missing Pixzy API Token configuration.");
            }

            const identifier = `ORDER-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
            const cleanDocument = customer.document ? customer.document.replace(/\D/g, "") : "";
            const cleanPhone = customer.phone ? customer.phone.replace(/\D/g, "") : "";

            const response = await fetch("https://pay.pixzy.io/api/transactions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Authorization": `Bearer ${apiToken}`,
              },
              body: JSON.stringify({
                amount,
                client_name: customer.name,
                client_email: customer.email || "contato@cotas.org",
                client_doc: cleanDocument || "00000000000",
                client_phone: cleanPhone || "00000000000",
                webhook_url: "https://example.com/webhook",
                description: "Cotas",
                metadata: {
                  identifier,
                  provider: "Cotas",
                  description: "Cotas",
                },
              }),
            });

            const responseText = await response.text();
            if (!response.ok) {
              throw new Error(`Pixzy API error: ${responseText}`);
            }

            const data = JSON.parse(responseText);
            if (data.status !== "success" || !data.data) {
              throw new Error(data.message || "Unknown Pixzy error");
            }

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              success: true,
              pixCode: data.data.br_code,
              qrcodeBase64: "",
              transactionId: data.data.transaction_id,
              externalRef: identifier,
              gateway: "pixzy",
              expiresAt: null,
            }));
          } catch (err: any) {
            console.error("Local Vite server error:", err);
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: err.message }));
          }
          return;
        }

        // 3. Check PIX Status
        if (pathname === '/functions/v1/check-pix-status') {
          try {
            const transactionId = url.searchParams.get("transaction_id");
            const gateway = url.searchParams.get("gateway");
            const externalRef = url.searchParams.get("external_ref");
            const apiKey = url.searchParams.get("apiKey");
            const apiToken = url.searchParams.get("apiToken");

            if (!transactionId || !gateway) {
              throw new Error("Missing transaction_id or gateway query parameter.");
            }

            let mappedStatus = "pending";

            if (gateway === "paradise") {
              if (!apiKey) throw new Error("Missing Paradise API Key.");
              const referenceId = externalRef || transactionId;
              const queryUrl = `https://multi.paradisepags.com/api/v1/query.php?action=list_transactions&external_id=${referenceId}&api_key=${apiKey}`;
              
              const response = await fetch(queryUrl);
              const data = (await response.json()) as any;
              if (Array.isArray(data) && data.length > 0) {
                const s = data[0].status;
                if (s === "paid" || s === "approved") mappedStatus = "paid";
                else if (s === "expired") mappedStatus = "expired";
                else if (s === "canceled") mappedStatus = "canceled";
              }
            } else if (gateway === "pixzy") {
              if (!apiToken) throw new Error("Missing Pixzy API Token.");
              const response = await fetch(`https://pay.pixzy.io/api/transactions/${transactionId}`, {
                headers: {
                  "Accept": "application/json",
                  "Authorization": `Bearer ${apiToken}`,
                },
              });
              const data = (await response.json()) as any;
              if (data.status === "success" && data.data) {
                const s = data.data.status;
                if (s === "paid") mappedStatus = "paid";
                else if (s === "expired") mappedStatus = "expired";
                else if (s === "failed") mappedStatus = "failed";
              }
            }

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, status: mappedStatus }));
          } catch (err: any) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: err.message }));
          }
          return;
        }

        // 4. Send Utmify Order
        if (pathname === '/functions/v1/send-utmify-order' && req.method === 'POST') {
          try {
            console.log("Local Vite server: Intercepted send-utmify-order");
            const body = (await getBody()) as any;
            const { orderPayload, apiToken } = body;

            if (!apiToken) {
              throw new Error("Missing Utmify API Token.");
            }

            const clientIp = req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
            if (clientIp && orderPayload && orderPayload.customer && !orderPayload.customer.ip) {
              orderPayload.customer.ip = Array.isArray(clientIp) ? clientIp[0] : String(clientIp).split(',')[0].trim();
            }

            const response = await fetch("https://api.utmify.com.br/api-credentials/orders", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-api-token": apiToken,
              },
              body: JSON.stringify(orderPayload),
            });

            const responseText = await response.text();
            console.log("Local Utmify response:", responseText);

            if (!response.ok) {
              throw new Error(`Utmify API returned error: ${response.status} - ${responseText}`);
            }

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, data: responseText }));
          } catch (err: any) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: err.message }));
          }
          return;
        }

        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), edgeFunctionsMiddleware()],
})
