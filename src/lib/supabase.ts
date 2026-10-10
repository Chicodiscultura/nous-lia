import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://rljsgatssqmqktojeksq.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsanNnYXRzc3FtcWt0b2pla3NxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwMjg3NDcsImV4cCI6MjEwMDYwNDc0N30.BNGCfvC_7oPj1GeEr1n6UwDQhP205-Vk2rDJeBAwAgU";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
