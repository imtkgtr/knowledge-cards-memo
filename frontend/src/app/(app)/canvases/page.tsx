import { CanvasListPageClient } from "@/features/canvas-list/components/canvas-list-page-client";
import { serverFetchCanvases } from "@/lib/api/backend";
import type { CanvasSummary } from "@/lib/api/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function CanvasesPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let canvases: CanvasSummary[] = [];
  let errorMessage: string | null = null;

  if (session?.access_token) {
    try {
      canvases = await serverFetchCanvases(session.access_token);
    } catch (error) {
      errorMessage =
        error instanceof Error ? error.message : "キャンバス一覧の取得に失敗しました。";
    }
  }

  return (
    <CanvasListPageClient
      initialCanvases={canvases}
      initialError={errorMessage}
      userEmail={user?.email}
    />
  );
}
