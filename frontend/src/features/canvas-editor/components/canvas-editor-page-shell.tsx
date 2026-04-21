"use client";

import type { CanvasDocument } from "@/lib/api/types";
import dynamic from "next/dynamic";

const CanvasEditorPageClientNoSsr = dynamic(
  () =>
    import("./canvas-editor-page-client").then((module) => ({
      default: module.CanvasEditorPageClient,
    })),
  {
    ssr: false,
  },
);

type CanvasEditorPageShellProps = {
  initialDocument: CanvasDocument;
};

export function CanvasEditorPageShell({ initialDocument }: CanvasEditorPageShellProps) {
  return <CanvasEditorPageClientNoSsr initialDocument={initialDocument} />;
}
