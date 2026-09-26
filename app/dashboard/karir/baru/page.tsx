"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/useAuth";
import { JobService, type JobType } from "@/lib/jobs";

const TYPES: { value: JobType; label: string }[] = [
  { value: "penuh-waktu", label: "Penuh waktu" },
  { value: "paruh-waktu", label: "Paruh waktu" },
  { value: "lepas", label: "Lepas (freelance)" },
  { value: "magang", label: "Magang" },
];

export default function NewJobPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [type, setType] = useState<JobType>("penuh-waktu");
  const [description, setDescription] = useState("");
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
        .slice(0, 8);

      const id = await JobService.create(
        { uid: user.uid, name: user.displayName || user.email || "Anonim" },
        { title: title.trim(), company: company.trim(), type, description: description.trim(), tags }
      );
      router.push(`/dashboard/karir/${id}`);
    } catch (err) {
      setError("Gagal memasang lowongan. Coba lagi.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <Link href="/dashboard/karir" className="font-mono text-xs text-paper-faint hover:text-paper">
        ← Kembali ke Karir
      </Link>

      <h1 className="mt-3 font-display text-2xl font-semibold text-paper sm:text-3xl">
        Pasang lowongan
      </h1>
      <p className="mt-1 text-sm text-paper-dim">
        Terbuka untuk siapa saja di TSC — bukan cuma admin. Isi tag skill
        yang dicari supaya kecocokan otomatis kelihatan buat pencari kerja.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div>
          <label htmlFor="title" className="mb-1.5 block text-sm text-paper-dim">
            Posisi
          </label>
          <input
            id="title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-md border border-ink-line bg-ink-soft px-3.5 py-2.5 text-sm text-paper outline-none focus:border-amber"
            placeholder="Frontend Developer (Junior)"
          />
        </div>

        <div>
          <label htmlFor="company" className="mb-1.5 block text-sm text-paper-dim">
            Perusahaan/Tim
          </label>
          <input
            id="company"
            required
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="w-full rounded-md border border-ink-line bg-ink-soft px-3.5 py-2.5 text-sm text-paper outline-none focus:border-amber"
            placeholder="Nama perusahaan"
          />
        </div>

        <div>
          <p className="mb-1.5 text-sm text-paper-dim">Tipe</p>
          <div className="grid grid-cols-2 gap-2">
            {TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setType(t.value)}
                className={`rounded-md border px-3 py-2 text-sm ${
                  type === t.value ? "border-amber bg-amber/10 text-amber-soft" : "border-ink-line text-paper-dim"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="description" className="mb-1.5 block text-sm text-paper-dim">
            Deskripsi
          </label>
          <textarea
            id="description"
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-md border border-ink-line bg-ink-soft px-3.5 py-2.5 text-sm text-paper outline-none focus:border-amber"
            placeholder="Tanggung jawab, kualifikasi, cara melamar..."
          />
        </div>

        <div>
          <label htmlFor="tags" className="mb-1.5 block text-sm text-paper-dim">
            Tag skill yang dicari (pisahkan dengan koma)
          </label>
          <input
            id="tags"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            className="w-full rounded-md border border-ink-line bg-ink-soft px-3.5 py-2.5 text-sm text-paper outline-none focus:border-amber"
            placeholder="react, css, git"
          />
        </div>

        {error && <p className="text-sm text-[#F45D5D]">{error}</p>}

        <button
          type="submit"
          disabled={creating}
          className="w-full rounded-md bg-amber py-2.5 text-sm font-semibold text-ink shadow-glow transition-transform hover:-translate-y-0.5 disabled:opacity-60"
        >
          {creating ? "Memasang..." : "Pasang lowongan"}
        </button>
      </form>
    </div>
  );
}
