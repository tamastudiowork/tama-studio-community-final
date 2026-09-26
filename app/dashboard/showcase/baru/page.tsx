"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/useAuth";
import { ShowcaseService } from "@/lib/showcase";
import { RepoService, type Repo } from "@/lib/repos";

export default function NewShowcasePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [repoId, setRepoId] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [myRepos, setMyRepos] = useState<Repo[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    RepoService.listMine(user.uid).then(setMyRepos);
  }, [user]);

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

      const id = await ShowcaseService.create(
        { uid: user.uid, name: user.displayName || user.email || "Anonim", photoURL: user.photoURL },
        { title: title.trim(), description: description.trim(), imageUrl: imageUrl.trim(), repoId: repoId || null, tags }
      );
      router.push(`/dashboard/showcase/${id}`);
    } catch (err) {
      setError("Gagal memamerkan karya. Coba lagi.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <Link href="/dashboard/showcase" className="font-mono text-xs text-paper-faint hover:text-paper">
        ← Kembali ke Showcase
      </Link>

      <h1 className="mt-3 font-display text-2xl font-semibold text-paper sm:text-3xl">
        Pamerkan karya
      </h1>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div>
          <label htmlFor="title" className="mb-1.5 block text-sm text-paper-dim">
            Judul
          </label>
          <input
            id="title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-md border border-ink-line bg-ink-soft px-3.5 py-2.5 text-sm text-paper outline-none focus:border-amber"
            placeholder="Aplikasi to-do list dengan animasi"
          />
        </div>

        <div>
          <label htmlFor="description" className="mb-1.5 block text-sm text-paper-dim">
            Cerita di baliknya
          </label>
          <textarea
            id="description"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-md border border-ink-line bg-ink-soft px-3.5 py-2.5 text-sm text-paper outline-none focus:border-amber"
            placeholder="Dibikin buat apa, pakai teknologi apa, tantangannya apa?"
          />
        </div>

        <div>
          <label htmlFor="imageUrl" className="mb-1.5 block text-sm text-paper-dim">
            URL gambar/screenshot (opsional)
          </label>
          <input
            id="imageUrl"
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            className="w-full rounded-md border border-ink-line bg-ink-soft px-3.5 py-2.5 text-sm text-paper outline-none focus:border-amber"
            placeholder="https://..."
          />
          <p className="mt-1 text-xs text-paper-faint">
            Belum ada upload gambar langsung — tempel link gambar yang sudah di-hosting (imgur, dsb).
          </p>
        </div>

        {myRepos.length > 0 && (
          <div>
            <label htmlFor="repoId" className="mb-1.5 block text-sm text-paper-dim">
              Hubungkan ke repo kamu (opsional)
            </label>
            <select
              id="repoId"
              value={repoId}
              onChange={(e) => setRepoId(e.target.value)}
              className="w-full rounded-md border border-ink-line bg-ink-soft px-3.5 py-2.5 text-sm text-paper outline-none focus:border-amber"
            >
              <option value="">Tidak dihubungkan</option>
              {myRepos.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label htmlFor="tags" className="mb-1.5 block text-sm text-paper-dim">
            Tag (pisahkan dengan koma)
          </label>
          <input
            id="tags"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            className="w-full rounded-md border border-ink-line bg-ink-soft px-3.5 py-2.5 text-sm text-paper outline-none focus:border-amber"
            placeholder="react, animasi, ui"
          />
        </div>

        {error && <p className="text-sm text-[#F45D5D]">{error}</p>}

        <button
          type="submit"
          disabled={creating}
          className="w-full rounded-md bg-amber py-2.5 text-sm font-semibold text-ink shadow-glow transition-transform hover:-translate-y-0.5 disabled:opacity-60"
        >
          {creating ? "Mengirim..." : "Pamerkan"}
        </button>
      </form>
    </div>
  );
}
