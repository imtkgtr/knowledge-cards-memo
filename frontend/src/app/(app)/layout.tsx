import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

type ProtectedLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default async function ProtectedLayout({ children }: ProtectedLayoutProps) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return children;
}
