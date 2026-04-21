import { CanvasEditorPageShell } from "@/features/canvas-editor/components/canvas-editor-page-shell";
import { serverFetchCanvasDocument } from "@/lib/api/backend";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type CanvasEditorPageProps = Readonly<{
  params: Promise<{
    canvasId: string;
  }>;
}>;

export default async function CanvasEditorPage({ params }: CanvasEditorPageProps) {
  const { canvasId } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("セッションが見つかりません。");
  }

  const document = await serverFetchCanvasDocument(session.access_token, canvasId);

  return <CanvasEditorPageShell initialDocument={document} />;
}
