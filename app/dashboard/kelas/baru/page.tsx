"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/useAuth";
import { BookService, type BookVisibility } from "@/lib/books";

export default function NewBookPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<BookVisibility>("public");
  const [tagsInput, setTagsInput] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setCreating(true);
    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 6);

      const id = await BookService.create(
        { uid: user.uid, name: user.displayName || user.email || "Anonim", photoURL: user.photoURL },
        { title: title.trim(), description: description.trim(), visibility, tags }
      );
      router.push(`/dashboard/kelas/${id}`);
    } catch (err) {
      setError("Gagal membuat buku. Coba lagi.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <Link href="/dashboard/kelas" className="font-mono text-xs text-paper-faint hover:text-paper">
        ← Kembali ke Kelas
      </Link>

      <h1 className="mt-3 font-display text-2xl font-semibold text-paper sm:text-3xl">
        Tulis buku baru
      </h1>
      <p className="mt-1 text-sm text-paper-dim">
        Buku dimulai dengan satu bab pengantar — bab lain bisa ditambah
        setelah dibuat.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div>
          <label htmlFor="title" className="mb-1.5 block text-sm text-paper-dim">
            Judul buku
          </label>
          <input
            id="title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-md border border-ink-line bg-ink-soft px-3.5 py-2.5 text-sm text-paper outline-none focus:border-amber"
            placeholder="Dasar-dasar HTML"
          />
        </div>

        <div>
          <label htmlFor="description" className="mb-1.5 block text-sm text-paper-dim">
            Deskripsi
          </label>
          <textarea
            id="description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-md border border-ink-line bg-ink-soft px-3.5 py-2.5 text-sm text-paper outline-none focus:border-amber"
            placeholder="Buku ini akan mengajarkan apa?"
          />
        </div>

        <div>
          <label htmlFor="tags" className="mb-1.5 block text-sm text-paper-dim">
            Tag (pisahkan dengan koma)
          </label>
          <input
            id="tags"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            className="w-full rounded-md border border-ink-line bg-ink-soft px-3.5 py-2.5 text-sm text-paper outline-none focus:border-amber"
            placeholder="html, pemula, web"
          />
        </div>

        <div>
          <p className="mb-1.5 text-sm text-paper-dim">Visibilitas</p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setVisibility("public")}
              className={`flex-1 rounded-md border px-4 py-2.5 text-sm font-medium transition-colors ${
                visibility === "public"
                  ? "border-amber bg-amber/10 text-amber-soft"
                  : "border-ink-line text-paper-dim"
              }`}
            >
              Publik
            </button>
            <button
              type="button"
              onClick={() => setVisibility("private")}
              className={`flex-1 rounded-md border px-4 py-2.5 text-sm font-medium transition-colors ${
                visibility === "private"
                  ? "border-amber bg-amber/10 text-amber-soft"
                  : "border-ink-line text-paper-dim"
              }`}
            >
              Privat
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-[#F45D5D]">{error}</p>}

        <button
          type="submit"
          disabled={creating}
          className="w-full rounded-md bg-amber py-2.5 text-sm font-semibold text-ink shadow-glow transition-transform hover:-translate-y-0.5 disabled:opacity-60"
        >
          {creating ? "Membuat..." : "Buat buku"}
        </button>
      </form>
    </div>
  );
}
