"use client";

import { useParams } from "next/navigation";

// The old built-in Monaco workbench (components/code-editor/) has been
// replaced by a separate, actively-developed editor app
// (tama-studio-code), deployed on its own Netlify site. We open it here
// instead of bundling it into this Next.js build — different build
// tooling (Vite vs Next), safer to keep isolated so a change in one
// never breaks the other's deploy.
const EDITOR_BASE_URL =
  process.env.NEXT_PUBLIC_CODE_EDITOR_URL || "https://tamastudiocode.netlify.app";

export default function RepoEditorPage() {
  const params = useParams<{ id: string }>();
  const repoId = params.id;
  const editorUrl = `${EDITOR_BASE_URL}/?repo=${encodeURIComponent(repoId)}`;

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-5 text-center">
      <div className="text-4xl">🧑‍💻</div>
      <h1 className="font-display text-xl font-semibold text-paper">
        Buka repo ini di Tama Studio Code
      </h1>
      <p className="max-w-md text-sm text-paper-dim">
        Editor kode TSC sekarang jalan di aplikasi terpisah yang terus
        diperbarui. Klik tombol di bawah buat buka repo{" "}
        <span className="font-mono text-mint">{repoId}</span> di sana.
      </p>
      <a
        href={editorUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-md bg-amber px-6 py-3 text-sm font-semibold text-ink shadow-glow transition-transform hover:-translate-y-0.5"
      >
        Buka Editor →
      </a>
    </div>
  );
}
