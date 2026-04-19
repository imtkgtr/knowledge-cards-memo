"use client";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type AuthMode = "sign-in" | "sign-up";

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const supabase = createBrowserSupabaseClient();

  function submit() {
    setError(null);
    setMessage(null);

    startTransition(async () => {
      if (mode === "sign-in") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          setError(signInError.message);
          return;
        }

        router.push("/canvases");
        router.refresh();
        return;
      }

      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      setMessage("アカウントを作成しました。続けてログインしてください。");
      setMode("sign-in");
    });
  }

  async function signOutDemoSession() {
    await supabase.auth.signOut();
    router.refresh();
  }

  return (
    <section className="auth-card">
      <div className="auth-card__header">
        <p className="eyebrow">Knowledge Canvas</p>
        <h1>知識キャンバスへ入る</h1>
        <p className="muted">
          知識カードを空間へ配置して、構造を見渡せるワークスペースを使います。
        </p>
      </div>

      <div className="auth-switch">
        <button
          className={mode === "sign-in" ? "button button--accent" : "button button--ghost"}
          type="button"
          onClick={() => setMode("sign-in")}
        >
          ログイン
        </button>
        <button
          className={mode === "sign-up" ? "button button--accent" : "button button--ghost"}
          type="button"
          onClick={() => setMode("sign-up")}
        >
          新規登録
        </button>
      </div>

      <label className="field">
        <span>メールアドレス</span>
        <input
          autoComplete="email"
          className="input"
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          value={email}
        />
      </label>

      <label className="field">
        <span>パスワード</span>
        <input
          autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
          className="input"
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          value={password}
        />
      </label>

      {message ? <p className="notice notice--success">{message}</p> : null}
      {error ? <p className="notice notice--error">{error}</p> : null}

      <div className="auth-actions">
        <button
          className="button button--accent"
          disabled={isPending}
          onClick={submit}
          type="button"
        >
          {isPending ? "送信中..." : mode === "sign-in" ? "ログインする" : "登録する"}
        </button>
        <button className="button button--ghost" onClick={signOutDemoSession} type="button">
          セッションを消す
        </button>
      </div>
    </section>
  );
}
