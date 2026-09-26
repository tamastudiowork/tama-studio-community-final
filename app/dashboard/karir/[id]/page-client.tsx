"use client";

import { useEffect, useState, FormEvent } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { JobService, type Job, type Application, type JobType } from "@/lib/jobs";
import ReportButton from "@/components/ReportButton";

const TYPE_LABEL: Record<JobType, string> = {
  "penuh-waktu": "Penuh waktu",
  "paruh-waktu": "Paruh waktu",
  lepas: "Lepas (freelance)",
  magang: "Magang",
};

export default function JobDetailPage() {
  const params = useParams<{ id: string }>();
  const jobId = params.id;
  const { user } = useAuth();

  const [job, setJob] = useState<Job | null | undefined>(undefined);
  const [applications, setApplications] = useState<Application[]>([]);
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [message, setMessage] = useState("");
  const [portfolioLink, setPortfolioLink] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    JobService.get(jobId).then(setJob);
  }, [jobId]);

  const isPoster = Boolean(user && job && user.uid === job.posterId);

  useEffect(() => {
    if (!isPoster) return;
    const unsub = JobService.subscribeApplications(jobId, setApplications);
    return unsub;
  }, [jobId, isPoster]);

  useEffect(() => {
    if (!user) return;
    JobService.hasApplied(jobId, user.uid).then(setAlreadyApplied);
  }, [jobId, user]);

  async function handleApply(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSending(true);
    try {
      await JobService.apply(
        jobId,
        { uid: user.uid, name: user.displayName || user.email || "Anonim", email: user.email || "" },
        { message, portfolioLink }
      );
      setAlreadyApplied(true);
    } finally {
      setSending(false);
    }
  }

  if (job === undefined) return <p className="p-8 font-mono text-sm text-paper-faint">Memuat...</p>;
  if (job === null) return <p className="p-8 text-sm text-paper-dim">Lowongan tidak ditemukan.</p>;

  return (
    <div className="mx-auto max-w-2xl">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-mint">{TYPE_LABEL[job.type]}</p>
      <h1 className="mt-2 font-display text-2xl font-semibold text-paper sm:text-3xl">{job.title}</h1>
      <p className="mt-1 text-sm text-paper-faint">{job.company} · dipasang oleh {job.posterName}</p>

      {job.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {job.tags.map((tag) => (
            <span key={tag} className="rounded-md bg-ink-surface px-2 py-0.5 font-mono text-[11px] text-paper-faint">
              #{tag}
            </span>
          ))}
        </div>
      )}

      <p className="mt-5 whitespace-pre-wrap text-sm leading-relaxed text-paper-dim">{job.description}</p>

      {!isPoster && (
        <div className="mt-3">
          <ReportButton targetType="job" targetId={job.id} targetLabel={job.title} targetHref={`/dashboard/karir/${job.id}`} />
        </div>
      )}

      {isPoster ? (
        <div className="mt-10">
          <p className="font-display text-lg font-semibold text-paper">
            Pelamar ({applications.length})
          </p>
          <div className="mt-4 space-y-3">
            {applications.length === 0 && (
              <p className="text-sm text-paper-faint">Belum ada yang melamar.</p>
            )}
            {applications.map((app) => (
              <div key={app.id} className="rounded-card border border-ink-line bg-ink-soft p-4">
                <p className="text-sm font-medium text-paper">{app.applicantName}</p>
                <p className="text-xs text-paper-faint">{app.applicantEmail}</p>
                {app.message && <p className="mt-2 text-sm text-paper-dim">{app.message}</p>}
                {app.portfolioLink && (
                  <a
                    href={app.portfolioLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-xs text-amber-soft hover:underline"
                  >
                    Lihat portofolio →
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : alreadyApplied ? (
        <div className="mt-10 rounded-card border border-mint-dim bg-ink-soft p-5">
          <p className="text-sm font-medium text-mint">Lamaran kamu sudah terkirim.</p>
        </div>
      ) : (
        <form onSubmit={handleApply} className="mt-10 space-y-4">
          <p className="font-display text-lg font-semibold text-paper">Lamar posisi ini</p>
          <div>
            <label htmlFor="message" className="mb-1.5 block text-sm text-paper-dim">
              Pesan singkat
            </label>
            <textarea
              id="message"
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full rounded-md border border-ink-line bg-ink-soft px-3.5 py-2.5 text-sm text-paper outline-none focus:border-amber"
              placeholder="Kenapa kamu cocok buat posisi ini?"
            />
          </div>
          <div>
            <label htmlFor="portfolio" className="mb-1.5 block text-sm text-paper-dim">
              Link portofolio/repo (opsional)
            </label>
            <input
              id="portfolio"
              type="url"
              value={portfolioLink}
              onChange={(e) => setPortfolioLink(e.target.value)}
              className="w-full rounded-md border border-ink-line bg-ink-soft px-3.5 py-2.5 text-sm text-paper outline-none focus:border-amber"
              placeholder="https://..."
            />
          </div>
          <button
            type="submit"
            disabled={sending}
            className="w-full rounded-md bg-amber py-2.5 text-sm font-semibold text-ink shadow-glow disabled:opacity-60"
          >
            {sending ? "Mengirim..." : "Kirim lamaran"}
          </button>
        </form>
      )}
    </div>
  );
}
