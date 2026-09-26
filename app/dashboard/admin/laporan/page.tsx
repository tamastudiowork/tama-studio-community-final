"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ReportService, type Report, type ReportStatus } from "@/lib/reports";

const TYPE_LABEL: Record<Report["targetType"], string> = {
  repo: "Repo",
  book: "Buku",
  group: "Grup",
  message: "Pesan grup",
  showcase: "Showcase",
  clip: "Klip",
  job: "Lowongan",
  post: "Postingan",
};

const STATUS_LABEL: Record<ReportStatus, string> = {
  pending: "Menunggu",
  resolved: "Selesai",
  dismissed: "Diabaikan",
};

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [filter, setFilter] = useState<ReportStatus | "all">("pending");

  useEffect(() => {
    const unsub = ReportService.subscribeAll(setReports);
    return unsub;
  }, []);

  async function setStatus(id: string, status: ReportStatus) {
    await ReportService.setStatus(id, status);
  }

  const visible = filter === "all" ? reports : reports.filter((r) => r.status === filter);

  return (
    <div>
      <div className="flex gap-1 rounded-md border border-ink-line bg-ink-soft p-1 w-fit">
        {(["pending", "resolved", "dismissed", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === f ? "bg-ink-surface text-paper" : "text-paper-dim"
            }`}
          >
            {f === "all" ? "Semua" : STATUS_LABEL[f]}
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-3">
        {visible.length === 0 && (
          <p className="rounded-card border border-dashed border-ink-line px-4 py-10 text-center text-sm text-paper-dim">
            Tidak ada laporan di kategori ini.
          </p>
        )}
        {visible.map((r) => (
          <div key={r.id} className="rounded-card border border-ink-line bg-ink-soft p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <span className="rounded-full border border-ink-line px-2 py-0.5 text-[10px] uppercase text-paper-faint">
                  {TYPE_LABEL[r.targetType]}
                </span>
                <Link href={r.targetHref} className="ml-2 text-sm font-medium text-paper hover:text-amber-soft">
                  {r.targetLabel}
                </Link>
              </div>
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] uppercase ${
                  r.status === "pending"
                    ? "border-amber-dim text-amber-soft"
                    : r.status === "resolved"
                    ? "border-mint-dim text-mint"
                    : "border-ink-line text-paper-faint"
                }`}
              >
                {STATUS_LABEL[r.status]}
              </span>
            </div>
            <p className="mt-2 text-sm text-paper-dim">{r.reason}</p>
            <p className="mt-1 text-xs text-paper-faint">
              Dilaporkan oleh {r.reporterName} · {new Date(r.createdAt).toLocaleString("id-ID")}
            </p>

            {r.status === "pending" && (
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => setStatus(r.id, "resolved")}
                  className="rounded-md bg-mint/15 px-3 py-1.5 text-xs font-medium text-mint"
                >
                  Tandai selesai
                </button>
                <button
                  onClick={() => setStatus(r.id, "dismissed")}
                  className="rounded-md border border-ink-line px-3 py-1.5 text-xs text-paper-dim"
                >
                  Abaikan
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
