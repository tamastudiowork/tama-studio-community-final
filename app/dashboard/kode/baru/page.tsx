"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/useAuth";
import { RepoService, type RepoVisibility } from "@/lib/repos";

const STARTER_FILES = {
  "README.md": {
    content: "# Proyek baru\n\nCeritakan proyek ini di sini.\n",
  },
  "main.js": {
    content: "console.log('Halo dari Tama Studio Community');\n",
  },
};

export default function NewRepoPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<RepoVisibility>("public");
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

      const id = await RepoService.create(
        { uid: user.uid, name: user.displayName || user.email || "Anonim", photoURL: user.photoURL },
        { name: name.trim(), description: description.trim(), visibility, tags, files: STARTER_FILES }
      );
      router.push(`/dashboard/kode/${id}`);
    } catch (err) {
      setError("Gagal membuat repo. Coba lagi.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <Link href="/dashboard/kode" className="font-mono text-xs text-paper-faint hover:text-paper">
        ← Kembali ke Repo
      </Link>

      <h1 className="mt-3 font-display text-2xl font-semibold text-paper sm:text-3xl">
        Repo baru
      </h1>
      <p className="mt-1 text-sm text-paper-dim">
        Repo publik bisa dilihat & di-fork siapa saja. Repo privat hanya bisa
        dibuka lewat link, tidak muncul di daftar Jelajahi.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div>
          <label htmlFor="name" className="mb-1.5 block text-sm text-paper-dim">
            Nama repo
          </label>
          <input
            id="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-ink-line bg-ink-soft px-3.5 py-2.5 text-sm text-paper outline-none focus:border-amber"
            placeholder="landing-page-keren"
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
            placeholder="Proyek ini tentang apa?"
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
            placeholder="html, pemula, css"
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
          {creating ? "Membuat..." : "Buat repo"}
        </button>
      </form>
    </div>
  );
}
