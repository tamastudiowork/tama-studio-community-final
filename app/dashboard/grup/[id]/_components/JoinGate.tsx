"use client";

import { useState } from "react";
import type { Group } from "@/lib/groups";

export default function JoinGate({
  group,
  onJoinDirect,
  onJoinWithCode,
  onRequestJoin,
  requested,
}: {
  group: Group;
  onJoinDirect: () => Promise<void>;
  onJoinWithCode: (code: string) => Promise<boolean>;
  onRequestJoin: () => Promise<void>;
  requested: boolean;
}) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);

  async function handleCodeJoin() {
    setBusy(true);
    setCodeError(null);
    try {
      const ok = await onJoinWithCode(code);
      if (!ok) setCodeError("Kode tidak cocok.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <p className="font-display text-xl font-semibold text-paper">{group.name}</p>
      {group.description && <p className="mt-1.5 max-w-sm text-sm text-paper-dim">{group.description}</p>}
      <p className="mt-3 font-mono text-xs text-paper-faint">{group.memberCount} anggota</p>

      <div className="mt-6 w-full max-w-xs">
        {group.joinMethod === "public" || group.joinMethod === "link" ? (
          <button
            onClick={() => {
              setBusy(true);
              onJoinDirect().finally(() => setBusy(false));
            }}
            disabled={busy}
            className="w-full rounded-md bg-amber py-2.5 text-sm font-semibold text-ink shadow-glow disabled:opacity-60"
          >
            {busy ? "Bergabung..." : "Gabung grup"}
          </button>
        ) : group.joinMethod === "code" ? (
          <div className="space-y-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Masukkan kode undangan"
              className="w-full rounded-md border border-ink-line bg-ink-soft px-3.5 py-2.5 text-center font-mono text-sm uppercase tracking-widest text-paper outline-none focus:border-amber"
              maxLength={8}
            />
            {codeError && <p className="text-xs text-[#F45D5D]">{codeError}</p>}
            <button
              onClick={handleCodeJoin}
              disabled={busy || !code.trim()}
              className="w-full rounded-md bg-amber py-2.5 text-sm font-semibold text-ink shadow-glow disabled:opacity-60"
            >
              {busy ? "Memeriksa..." : "Gabung dengan kode"}
            </button>
          </div>
        ) : requested ? (
          <p className="rounded-md border border-ink-line px-4 py-2.5 text-sm text-paper-dim">
            Permintaan terkirim — menunggu persetujuan admin.
          </p>
        ) : (
          <button
            onClick={() => {
              setBusy(true);
              onRequestJoin().finally(() => setBusy(false));
            }}
            disabled={busy}
            className="w-full rounded-md bg-amber py-2.5 text-sm font-semibold text-ink shadow-glow disabled:opacity-60"
          >
            {busy ? "Mengirim..." : "Ajukan gabung"}
          </button>
        )}
      </div>
    </div>
  );
}
