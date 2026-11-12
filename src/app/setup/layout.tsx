import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { getServerSupabaseClient } from "@/lib/supabase/server";

export const instant = false;

export default async function SetupLayout({ children }: { children: ReactNode }) {
  const result = await getServerSupabaseClient();

  if (!result.configured) {
    redirect("/auth/sign-in?error=config&next=/setup");
  }

  const { data } = await result.client.auth.getClaims();

  if (!data?.claims) {
    redirect("/auth/sign-in?next=/setup");
  }

  return children;
}
