import { createClient } from "@supabase/supabase-js";

// Banco da LIA ("NOUS - LIA"). URL e chave publicável vêm do ambiente: em dev, do
// arquivo .env (fora do git); na VPS, do build. Nunca embuta a chave service_role aqui.
const SUPABASE_URL = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as
  | string
  | undefined;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error(
    "Faltam VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY. Copie .env.example para .env.",
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
