import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

async function createConfirmedUser(email: string, password: string) {
  const envText = await readFile("../backend/.env", "utf8");
  const entries = Object.fromEntries(
    envText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const separatorIndex = line.indexOf("=");
        return [line.slice(0, separatorIndex), line.slice(separatorIndex + 1)];
      }),
  );

  const supabaseUrl = entries.SUPABASE_URL;
  const serviceRoleKey = entries.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("backend/.env から Supabase の接続情報を読めませんでした。");
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      email_confirm: true,
      password,
    }),
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`confirmed user の作成に失敗しました: ${payload}`);
  }
}

test("ログインしてキャンバス作成とカード追加まで進める", async ({ page }) => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `knowledge.canvas.e2e.${suffix}@gmail.com`;
  const password = `Pass-${suffix}-Z9!`;
  const canvasName = `E2E Canvas ${suffix}`;
  const cardTitle = `E2E Card ${suffix}`;
  const tagName = `tag-${suffix}`;
  const paintColor = "#cfe5e7";
  const markdownBody = ["# 見出し", "", "- 箇条書き1", "- 箇条書き2"].join("\n");
  const pageErrors: string[] = [];

  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });

  await createConfirmedUser(email, password);

  await page.goto("/login");

  await expect(page.getByRole("heading", { name: "知識キャンバスへ入る" })).toBeVisible();
  await page.getByLabel("メールアドレス").fill(email);
  await page.getByLabel("パスワード").fill(password);
  await page.getByRole("button", { name: "ログインする" }).click();

  await page.waitForURL(/\/canvases(?:\?.*)?$/, { timeout: 15000 });
  await expect(page.getByRole("heading", { name: "キャンバス一覧" })).toBeVisible({
    timeout: 15000,
  });

  await page.getByRole("button", { name: "新規作成" }).click();
  await expect(page.getByRole("heading", { name: "キャンバスを作成" })).toBeVisible();
  await page.getByLabel("キャンバス名").fill(canvasName);
  await page.getByRole("button", { name: "作成する" }).click();

  await expect(page.getByRole("heading", { name: canvasName })).toBeVisible();
  await page.getByRole("link", { name: canvasName }).click();

  await page.waitForURL(/\/canvases\/.+/);
  await expect(page.getByRole("button", { name: "カードを追加" }).first()).toBeVisible();
  await page.getByRole("button", { name: "カードを追加" }).first().click();

  await expect(page.getByRole("heading", { name: "カードを作成" })).toBeVisible();
  await page.getByLabel("タイトル").fill(cardTitle);
  await page.getByRole("button", { name: "作成する" }).click();

  await expect(page.getByText(cardTitle).first()).toBeVisible();
  await expect(page.getByLabel("本文編集")).toHaveCount(0);
  await page.getByRole("button", { name: "カードを追加" }).first().click();
  await page.getByLabel("タイトル").fill(cardTitle);
  await page.getByRole("button", { name: "作成する" }).click();
  await expect(page.getByRole("heading", { name: "同じ名前のカードがあります" })).toBeVisible();
  await page.getByLabel("今後はこのキャンバスで表示しない").check();
  await page.getByRole("button", { name: "そのまま作成" }).click();
  await expect(page.getByRole("heading", { name: "同じ名前のカードがあります" })).toHaveCount(0);

  await page.getByRole("button", { name: "カードを追加" }).first().click();
  await page.getByLabel("タイトル").fill(cardTitle);
  await page.getByRole("button", { name: "作成する" }).click();
  await expect(page.getByRole("heading", { name: "同じ名前のカードがあります" })).toHaveCount(0);

  await expect(page.getByRole("heading", { name: "カード" })).toBeVisible();
  const preview = page.locator(".detail-markdown__preview").first();
  await expect(preview.getByText("本文はまだありません。")).toBeVisible();
  await preview.click();
  await expect(page.getByLabel("本文編集")).toBeVisible();
  await page.getByLabel("本文編集").fill(markdownBody);
  await page.getByRole("button", { name: "プレビュー" }).click();
  const modalPreview = page.locator(".dialog .detail-markdown__preview");
  await expect(modalPreview.getByText("見出し")).toBeVisible();
  await expect(modalPreview.locator("li")).toHaveCount(2);
  await page.getByRole("button", { name: "閉じる" }).click();

  await expect(preview.getByText("見出し")).toBeVisible();
  await expect(preview.locator("li")).toHaveCount(2);
  await expect(page.locator(".react-flow__node", { hasText: "箇条書き1" })).toHaveCount(0);

  const canvasNode = page.locator(".react-flow__node", { hasText: cardTitle });
  await expect(canvasNode).toHaveCount(1);

  await page.getByRole("button", { name: `色モード ${paintColor}` }).click();
  await canvasNode.click();
  await expect(page.getByLabel(`カード色 ${paintColor}`)).toHaveClass(/color-chip--active/);

  await page.getByRole("button", { name: "ロックモード" }).click();
  await canvasNode.click();
  await expect(page.getByLabel("タイトル")).toBeDisabled();
  await canvasNode.click();
  await expect(page.getByLabel("タイトル")).toBeEnabled();

  await page.getByPlaceholder("例: 設計, backend").fill(tagName);
  await page.getByPlaceholder("例: 設計, backend").press("Enter");
  await expect(page.getByRole("button", { name: `#${tagName}` }).first()).toBeVisible();

  await expect(page.getByRole("button", { name: /ファイルを添付/ })).toBeVisible();

  await page.getByRole("button", { name: "削除モード" }).click();
  await canvasNode.click();
  await expect(page.locator(".react-flow__node", { hasText: cardTitle })).toHaveCount(0);

  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
});
