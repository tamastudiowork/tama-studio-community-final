"use client";

import { useState } from "react";
import { BookService, type CoAuthor } from "@/lib/books";

export default function CollaboratorPanel({
  bookId,
  coAuthors,
  onClose,
  onChanged,
}: {
  bookId: string;
  coAuthors: CoAuthor[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleInvite() {
    if (!email.trim()) return;
    setSending(true);
    setError(null);
    try {
      const result = await BookService.inviteCoAuthor(bookId, email.trim());
      if (!result.ok) {
        setError(result.reason ?? "Gagal mengundang.");
      } else {
        setEmail("");
        onChanged();
      }
    } finally {
      setSending(false);
    }
  }

  async function handleRemove(uid: string) {
    await BookService.removeCoAuthor(bookId, uid);
    onChanged();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-card border border-ink-line bg-ink-soft p-5"
      >
        <p className="font-display text-base font-semibold text-paper">Kolaborator buku</p>
        <p className="mt-1 text-xs text-paper-faint">
          Kolaborator bisa tambah/edit/hapus bab seperti kamu, tapi tidak
          bisa ubah visibilitas, mengelola kolaborator lain, atau
          menghapus buku.
        </p>

        <div className="mt-4 space-y-2">
          {coAuthors.length === 0 && (
            <p className="text-xs text-paper-faint">Belum ada kolaborator.</p>
          )}
          {coAuthors.map((c) => (
            <div key={c.uid} className="flex items-center justify-between rounded-md border border-ink-line bg-ink px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm text-paper">{c.name}</p>
                <p className="truncate text-xs text-paper-faint">{c.email}</p>
              </div>
              <button
                onClick={() => handleRemove(c.uid)}
                className="shrink-0 text-xs text-paper-faint hover:text-[#F45D5D]"
              >
                Keluarkan
              </button>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <label htmlFor="invite-email" className="mb-1.5 block text-xs text-paper-dim">
            Undang lewat email (harus sudah punya akun TSC)
          </label>
          <div className="flex gap-2">
            <input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teman@email.com"
              className="flex-1 rounded-md border border-ink-line bg-ink px-3 py-2 text-sm text-paper outline-none focus:border-amber"
            />
            <button
              onClick={handleInvite}
              disabled={sending || !email.trim()}
              className="rounded-md bg-amber px-3 py-2 text-xs font-semibold text-ink disabled:opacity-60"
            >
              {sending ? "..." : "Undang"}
            </button>
          </div>
          {error && <p className="mt-1.5 text-xs text-[#F45D5D]">{error}</p>}
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full rounded-md border border-ink-line py-2 text-sm text-paper-dim"
        >
          Tutup
        </button>
      </div>
    </div>
  );
}
