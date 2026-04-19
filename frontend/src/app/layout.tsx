import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "知識キャンバス",
  description: "知識カードを空間に配置して構造を整理するワークスペース",
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
