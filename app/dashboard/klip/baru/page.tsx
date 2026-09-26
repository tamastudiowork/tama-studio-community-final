"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/useAuth";
import { ClipService } from "@/lib/clips";
import { PRIORITY_LANGUAGES } from "@/lib/languages";

export default function NewClipPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [caption, setCaption] = useState("");
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setCreating(true);
    try {
      await ClipService.create(
        { uid: user.uid, name: user.displayName || user.email || "Anonim", photoURL: user.photoURL },
        { caption: caption.trim(), code, language }
      );
      router.push("/dashboard/klip");
    } catch (err) {
      setError("Gagal mengirim klip. Coba lagi.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <Link href="/dashboard/klip" className="font-mono text-xs text-paper-faint hover:text-paper">
        ← Kembali ke Klip
      </Link>

      <h1 className="mt-3 font-display text-2xl font-semibold text-paper sm:text-3xl">
        Bagikan klip
      </h1>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div>
          <label htmlFor="caption" className="mb-1.5 block text-sm text-paper-dim">
            Keterangan
          </label>
          <input
            id="caption"
            required
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="w-full rounded-md border border-ink-line bg-ink-soft px-3.5 py-2.5 text-sm text-paper outline-none focus:border-amber"
            placeholder="Trik pendek buat debounce tanpa lodash"
          />
        </div>

        <div>
          <label htmlFor="language" className="mb-1.5 block text-sm text-paper-dim">
            Bahasa
          </label>
          <select
            id="language"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full rounded-md border border-ink-line bg-ink-soft px-3.5 py-2.5 text-sm text-paper outline-none focus:border-amber"
          >
            {PRIORITY_LANGUAGES.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="code" className="mb-1.5 block text-sm text-paper-dim">
            Kode
          </label>
          <textarea
            id="code"
            required
            rows={10}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full rounded-md border border-ink-line bg-ink-soft px-3.5 py-2.5 font-mono text-sm text-paper outline-none focus:border-amber"
            placeholder="function debounce(fn, delay) { ... }"
          />
        </div>

        {error && <p className="text-sm text-[#F45D5D]">{error}</p>}

        <button
          type="submit"
          disabled={creating}
          className="w-full rounded-md bg-amber py-2.5 text-sm font-semibold text-ink shadow-glow transition-transform hover:-translate-y-0.5 disabled:opacity-60"
        >
          {creating ? "Mengirim..." : "Kirim klip"}
        </button>
      </form>
    </div>
  );
}
