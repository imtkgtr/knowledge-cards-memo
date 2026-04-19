import { serverFetchCanvasDocument } from "@/lib/api/backend";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import Link from "next/link";

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

  let title = "キャンバス";
  let error: string | null = null;

  if (session?.access_token) {
    try {
      const document = await serverFetchCanvasDocument(session.access_token, canvasId);
      title = document.canvas.name;
    } catch (requestError) {
      error =
        requestError instanceof Error ? requestError.message : "キャンバスの取得に失敗しました。";
    }
  }

  return (
    <main className="editor-page">
      <header className="editor-page__header">
        <div>
          <p className="eyebrow">Canvas Editor</p>
          <h1>{title}</h1>
          <p className="muted">
            フェーズ 2 で React Flow
            ベースの編集画面を実装します。今は認証と一覧導線を優先しています。
          </p>
        </div>
        <Link className="button button--ghost" href="/canvases">
          一覧へ戻る
        </Link>
      </header>

      <section className="editor-placeholder">
        {error ? (
          <p className="notice notice--error">{error}</p>
        ) : (
          <>
            <div className="editor-placeholder__panel">
              <h2>このフェーズで実装済み</h2>
              <ul>
                <li>Supabase 認証</li>
                <li>保護ルート</li>
                <li>キャンバス一覧 CRUD</li>
                <li>キャンバス document API</li>
              </ul>
            </div>
            <div className="editor-placeholder__panel">
              <h2>次の実装対象</h2>
              <ul>
                <li>Editor shell</li>
                <li>React Flow canvas</li>
                <li>Card CRUD</li>
                <li>保存</li>
              </ul>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
