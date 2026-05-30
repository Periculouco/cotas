import { createClient } from "@supabase/supabase-js";

// Check if running locally. If so, point supabaseUrl to localhost/origin so that
// calls to supabase.functions.invoke are intercepted by the Vite dev server middleware.
const isLocal = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

const supabaseUrl = isLocal 
  ? window.location.origin 
  : (import.meta.env.VITE_SUPABASE_URL || "https://dwwkqxhpqwemanpibqkp.supabase.co");

const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_Zyw3POaz6VmIhCK8OZwnOQ_FNBxSCtc";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
