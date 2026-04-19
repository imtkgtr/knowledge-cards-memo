import { LoginForm } from "@/features/auth/components/login-form";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/canvases");
  }

  return (
    <main className="auth-page">
      <LoginForm />
    </main>
  );
}
