import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const url = raw.startsWith("http") ? raw : "https://placeholder.supabase.co";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";
  return createBrowserClient(url, key);
}
