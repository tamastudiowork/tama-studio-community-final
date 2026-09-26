"use client";

import { useState, FormEvent } from "react";

type Status = "idle" | "sending" | "sent" | "error";

export default function SuggestionBox() {
  const [status, setStatus] = useState<Status>("idle");

  // NOTE: this only manages UI state for now. Wiring this form to Firestore
  // (collection `suggestions`, read by the admin dashboard in Tahap 5) and
  // to the admin's reply-by-email flow happens once the backend for that
  // phase is built — see project roadmap.
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    await new Promise((r) => setTimeout(r, 600));
    setStatus("sent");
  }

  return (
    <section id="saran" className="mx-auto max-w-3xl px-5 pb-24">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-mint">
        Kotak saran
      </p>
      <h2 className="mt-3 font-display text-3xl font-semibold text-paper sm:text-4xl">
        Ada masukan buat TSC?
      </h2>
      <p className="mt-3 max-w-xl text-sm text-paper-dim">
        Kirim langsung ke admin. Kami baca semuanya dan balas lewat email
        yang kamu cantumkan.
      </p>

      {status === "sent" ? (
        <div className="mt-8 rounded-card border border-mint-dim bg-ink-soft p-6">
          <p className="font-medium text-mint">Saran kamu sudah terkirim.</p>
          <p className="mt-1 text-sm text-paper-dim">
            Terima kasih — kalau perlu balasan, kami hubungi lewat email yang
            kamu tulis.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="nama" className="mb-1.5 block text-sm text-paper-dim">
                Nama
              </label>
              <input
                id="nama"
                required
                className="w-full rounded-md border border-ink-line bg-ink-soft px-3.5 py-2.5 text-sm text-paper outline-none focus:border-amber"
                placeholder="Nama kamu"
              />
            </div>
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm text-paper-dim">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                className="w-full rounded-md border border-ink-line bg-ink-soft px-3.5 py-2.5 text-sm text-paper outline-none focus:border-amber"
                placeholder="kamu@email.com"
              />
            </div>
          </div>
          <div>
            <label htmlFor="pesan" className="mb-1.5 block text-sm text-paper-dim">
              Saran
            </label>
            <textarea
              id="pesan"
              required
              rows={4}
              className="w-full rounded-md border border-ink-line bg-ink-soft px-3.5 py-2.5 text-sm text-paper outline-none focus:border-amber"
              placeholder="Tulis masukan kamu di sini..."
            />
          </div>
          <button
            type="submit"
            disabled={status === "sending"}
            className="rounded-md bg-amber px-5 py-2.5 text-sm font-semibold text-ink shadow-glow transition-transform hover:-translate-y-0.5 disabled:opacity-60"
          >
            {status === "sending" ? "Mengirim..." : "Kirim saran"}
          </button>
        </form>
      )}
    </section>
  );
}
