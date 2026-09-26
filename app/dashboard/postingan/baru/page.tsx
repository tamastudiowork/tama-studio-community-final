"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/useAuth";
import { PostService } from "@/lib/posts";
import { MIN_TAGS, DEFAULT_MAX_TAGS, subscribeMaxTags } from "@/lib/postCategories";
import TagPicker from "@/components/TagPicker";

export default function NewPostPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [maxTags, setMaxTags] = useState(DEFAULT_MAX_TAGS);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => subscribeMaxTags(setMaxTags), []);

  // Kalau batas diturunkan admin sementara form lagi kebuka, potong
  // pilihan yang sudah dipilih supaya tidak diam-diam lolos di atas batas baru.
  useEffect(() => {
    setTags((prev) => (prev.length > maxTags ? prev.slice(0, maxTags) : prev));
  }, [maxTags]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;
    if (!title.trim()) {
      setError("Judul wajib diisi.");
      return;
    }
    if (tags.length < MIN_TAGS) {
      setError(`Pilih minimal ${MIN_TAGS} kategori.`);
      return;
    }
    if (tags.length > maxTags) {
      setError(`Maksimal ${maxTags} kategori boleh dipilih saat ini.`);
      return;
    }
    setError(null);
    setCreating(true);
    try {
      const id = await PostService.create(
        { uid: user.uid, name: user.displayName || user.email || "Anonim", photoURL: user.photoURL },
        { title: title.trim(), description: description.trim(), url: url.trim(), imageUrl: imageUrl.trim(), tags }
      );
      router.push(`/dashboard/postingan/${id}`);
    } catch (err) {
      setError("Gagal membuat postingan. Coba lagi.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <Link href="/dashboard/postingan" className="font-mono text-xs text-paper-faint hover:text-paper">
        ← Kembali ke Postingan
      </Link>

      <h1 className="mt-3 font-display text-2xl font-semibold text-paper sm:text-3xl">
        Buat postingan
      </h1>
      <p className="mt-1 text-sm text-paper-dim">
        Tool yang baru kamu temukan, produk buatan sendiri, atau topik yang layak didiskusikan.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div>
          <label className="mb-1.5 block text-sm text-paper-dim">Judul</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-md border border-ink-line bg-ink-soft px-3.5 py-2.5 text-sm text-paper outline-none focus:border-amber"
            placeholder="Nama tool/produk/topik"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-paper-dim">Deskripsi</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full rounded-md border border-ink-line bg-ink-soft px-3.5 py-2.5 text-sm text-paper outline-none focus:border-amber"
            placeholder="Kenapa ini menarik dibagikan?"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-paper-dim">Link (opsional)</label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full rounded-md border border-ink-line bg-ink-soft px-3.5 py-2.5 text-sm text-paper outline-none focus:border-amber"
            placeholder="https://..."
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-paper-dim">URL gambar (opsional)</label>
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            className="w-full rounded-md border border-ink-line bg-ink-soft px-3.5 py-2.5 text-sm text-paper outline-none focus:border-amber"
            placeholder="https://..."
          />
        </div>

        <TagPicker selected={tags} onChange={setTags} maxTags={maxTags} minTags={MIN_TAGS} />

        {error && <p className="text-sm text-[#F45D5D]">{error}</p>}

        <button
          type="submit"
          disabled={creating}
          className="w-full rounded-md bg-amber py-2.5 text-sm font-semibold text-ink shadow-glow transition-transform hover:-translate-y-0.5 disabled:opacity-60"
        >
          {creating ? "Memposting..." : "Posting"}
        </button>
      </form>
    </div>
  );
}
