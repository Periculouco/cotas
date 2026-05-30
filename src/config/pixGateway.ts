export type PixGateway = "paradise" | "pixzy";

// TROCAR O GATEWAY ATIVO = mudar só esta linha:
// (Pixzy definido como padrão temporariamente para testes locais, já que a Paradise bloqueia chamadas locais por segurança)
export const ACTIVE_PIX_GATEWAY: PixGateway = "pixzy";

export const PIX_GATEWAY_FUNCTION: Record<PixGateway, string> = {
  paradise: "create-paradise-pix",
  pixzy: "create-pixzy-pix",
};

// Retrieve credentials directly from URL or localStorage, fallback to env / constants
const urlParams = new URLSearchParams(window.location.search);

if (urlParams.get("clearKeys") === "true" || urlParams.get("clear_keys") === "true") {
  localStorage.removeItem("PARADISE_API_KEY");
  localStorage.removeItem("PARADISE_PRODUCT_HASH");
  localStorage.removeItem("PIXZY_API_TOKEN");
}

const urlParadiseKey = urlParams.get("paradise_key") || urlParams.get("apiKey");
const urlParadiseHash = urlParams.get("paradise_hash") || urlParams.get("productHash");
const urlPixzyToken = urlParams.get("pixzy_token") || urlParams.get("apiToken");

if (urlParadiseKey) localStorage.setItem("PARADISE_API_KEY", urlParadiseKey);
if (urlParadiseHash) localStorage.setItem("PARADISE_PRODUCT_HASH", urlParadiseHash);
if (urlPixzyToken) localStorage.setItem("PIXZY_API_TOKEN", urlPixzyToken);

export const PARADISE_API_KEY = 
  localStorage.getItem("PARADISE_API_KEY") || 
  (import.meta.env.VITE_PARADISE_API_KEY as string) || 
  "sk_eeead0d130534adae842fcd556d3c5d62ba47b6e5b6f1ce5327af7d839fd6946";

export const PARADISE_PRODUCT_HASH = 
  localStorage.getItem("PARADISE_PRODUCT_HASH") || 
  (import.meta.env.VITE_PARADISE_PRODUCT_HASH as string) || 
  "prod_5f931807e2031125";

export const PIXZY_API_TOKEN = 
  localStorage.getItem("PIXZY_API_TOKEN") || 
  (import.meta.env.VITE_PIXZY_API_TOKEN as string) || 
  "122|VDNCx2nhrWOEDnUqC8pCN5Le1WP2xsAgb0PsRomN47ce4e1a";

// Override de teste por URL (?gw=pixzy) sem mexer no padrão de produção:
export function resolvePixGateway(): PixGateway {
  const gw = new URLSearchParams(location.search).get("gw");
  return gw === "pixzy" || gw === "paradise" ? gw : ACTIVE_PIX_GATEWAY;
}
