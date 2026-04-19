"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublishableKey, getSupabaseUrl } from "./shared";

let browserClient: SupabaseClient | undefined;

export function createBrowserSupabaseClient() {
  if (!browserClient) {
    browserClient = createBrowserClient(getSupabaseUrl(), getSupabasePublishableKey());
  }
  return browserClient;
}
