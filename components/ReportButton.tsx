"use client";

import { useState } from "react";
import { useAuth } from "@/lib/useAuth";
import { ReportService, type ReportTargetType } from "@/lib/reports";

const REASONS = ["Spam", "Konten tidak pantas", "Pelecehan", "Pelanggaran hak cipta", "Lainnya"];

export default function ReportButton({
  targetType,
  targetId,
  targetLabel,
  targetHref,
  className,
}: {
  targetType: ReportTargetType;
  targetId: string;
  targetLabel: string;
  targetHref: string;
  className?: string;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    if (!user) return;
    setSending(true);
    try {
      await ReportService.create({
        targetType,
        targetId,
        targetLabel,
        targetHref,
        reporterId: user.uid,
        reporterName: user.displayName || user.email || "Anonim",
        reason: note.trim() ? `${reason}: ${note.trim()}` : reason,
      });
      setSent(true);
    } finally {
      setSending(false);
    }
  }

  if (!user) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={className ?? "text-xs text-paper-faint hover:text-[#F45D5D]"}
      >
        Laporkan
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-card border border-ink-line bg-ink-soft p-5"
          >
            {sent ? (
              <>
                <p className="font-display text-base font-semibold text-paper">Laporan terkirim</p>
                <p className="mt-1.5 text-sm text-paper-dim">
                  Tim admin akan meninjau &quot;{targetLabel}&quot;.
                </p>
                <button
                  onClick={() => setOpen(false)}
                  className="mt-4 w-full rounded-md border border-ink-line py-2 text-sm text-paper-dim"
                >
                  Tutup
                </button>
              </>
            ) : (
              <>
                <p className="font-display text-base font-semibold text-paper">
                  Laporkan &quot;{targetLabel}&quot;
                </p>
                <div className="mt-3 space-y-1.5">
                  {REASONS.map((r) => (
                    <button
                      key={r}
                      onClick={() => setReason(r)}
                      className={`block w-full rounded-md border px-3 py-2 text-left text-sm ${
                        reason === r ? "border-amber text-amber-soft" : "border-ink-line text-paper-dim"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  placeholder="Detail tambahan (opsional)"
                  className="mt-3 w-full rounded-md border border-ink-line bg-ink px-3 py-2 text-sm text-paper outline-none focus:border-amber"
                />
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={handleSubmit}
                    disabled={sending}
                    className="flex-1 rounded-md bg-amber py-2 text-sm font-semibold text-ink disabled:opacity-60"
                  >
                    {sending ? "Mengirim..." : "Kirim laporan"}
                  </button>
                  <button
                    onClick={() => setOpen(false)}
                    className="flex-1 rounded-md border border-ink-line py-2 text-sm text-paper-dim"
                  >
                    Batal
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
