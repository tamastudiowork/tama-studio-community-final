"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/useAuth";
import { GroupService, type JoinMethod } from "@/lib/groups";

const METHODS: { value: JoinMethod; label: string; desc: string }[] = [
  { value: "public", label: "Publik", desc: "Siapa saja langsung bisa gabung, satu klik." },
  { value: "code", label: "Kode undangan", desc: "Gabung pakai kode unik yang kamu bagikan sendiri." },
  { value: "approval", label: "Perlu persetujuan", desc: "Orang bisa ajukan gabung, kamu yang menyetujui." },
  { value: "link", label: "Lewat link saja", desc: "Tidak muncul di daftar Jelajahi, hanya bisa diakses lewat link langsung." },
];

export default function NewGroupPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [joinMethod, setJoinMethod] = useState<JoinMethod>("public");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setCreating(true);
    try {
      const id = await GroupService.create(
        { uid: user.uid, name: user.displayName || user.email || "Anonim", photoURL: user.photoURL },
        { name: name.trim(), description: description.trim(), joinMethod }
      );
      router.push(`/dashboard/grup/${id}`);
    } catch (err) {
      setError("Gagal membuat grup. Coba lagi.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <Link href="/dashboard/grup" className="font-mono text-xs text-paper-faint hover:text-paper">
        ← Kembali ke Grup
      </Link>

      <h1 className="mt-3 font-display text-2xl font-semibold text-paper sm:text-3xl">
        Grup baru
      </h1>
      <p className="mt-1 text-sm text-paper-dim">
        Grup dimulai dengan satu channel #umum. Kamu jadi owner otomatis.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div>
          <label htmlFor="name" className="mb-1.5 block text-sm text-paper-dim">
            Nama grup
          </label>
          <input
            id="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-ink-line bg-ink-soft px-3.5 py-2.5 text-sm text-paper outline-none focus:border-amber"
            placeholder="Frontend Pemula"
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
            placeholder="Grup ini buat siapa dan ngobrolin apa?"
          />
        </div>

        <div>
          <p className="mb-2 text-sm text-paper-dim">Cara orang bisa gabung</p>
          <div className="space-y-2">
            {METHODS.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setJoinMethod(m.value)}
                className={`w-full rounded-md border px-4 py-3 text-left transition-colors ${
                  joinMethod === m.value
                    ? "border-amber bg-amber/10"
                    : "border-ink-line hover:border-paper-dim"
                }`}
              >
                <p className={`text-sm font-medium ${joinMethod === m.value ? "text-amber-soft" : "text-paper"}`}>
                  {m.label}
                </p>
                <p className="mt-0.5 text-xs text-paper-faint">{m.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-[#F45D5D]">{error}</p>}

        <button
          type="submit"
          disabled={creating}
          className="w-full rounded-md bg-amber py-2.5 text-sm font-semibold text-ink shadow-glow transition-transform hover:-translate-y-0.5 disabled:opacity-60"
        >
          {creating ? "Membuat..." : "Buat grup"}
        </button>
      </form>
    </div>
  );
}
