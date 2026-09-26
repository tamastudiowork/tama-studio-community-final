"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/useAuth";
import { JobService, type Job, type JobType } from "@/lib/jobs";

const TYPE_LABEL: Record<JobType, string> = {
  "penuh-waktu": "Penuh waktu",
  "paruh-waktu": "Paruh waktu",
  lepas: "Lepas (freelance)",
  magang: "Magang",
};

export default function KarirPage() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [userTags, setUserTags] = useState<Set<string>>(new Set());

  useEffect(() => {
    JobService.listAll().then(setJobs);
  }, []);

  useEffect(() => {
    if (!user) return;
    JobService.getUserSkillTags(user.uid).then(setUserTags);
  }, [user]);

  const sorted = useMemo(() => {
    if (!jobs) return null;
    return [...jobs].sort((a, b) => JobService.matchScore(b, userTags) - JobService.matchScore(a, userTags));
  }, [jobs, userTags]);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-mint">Karir</p>
          <h1 className="mt-2 font-display text-2xl font-semibold text-paper sm:text-3xl">
            Job Match
          </h1>
          <p className="mt-1 text-sm text-paper-dim">
            Diurutkan berdasar kecocokan tag dengan repo & buku kamu.
          </p>
        </div>
        <Link
          href="/dashboard/karir/baru"
          className="rounded-md bg-amber px-4 py-2 text-sm font-semibold text-ink shadow-glow transition-transform hover:-translate-y-0.5"
        >
          + Pasang lowongan
        </Link>
      </div>

      <div className="mt-8 space-y-3">
        {sorted === null ? (
          <p className="font-mono text-sm text-paper-faint">Memuat...</p>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-ink-line px-6 py-16 text-center">
            <p className="text-sm text-paper-dim">Belum ada lowongan.</p>
          </div>
        ) : (
          sorted.map((job) => {
            const score = JobService.matchScore(job, userTags);
            return (
              <Link
                key={job.id}
                href={`/dashboard/karir/${job.id}`}
                className="flex items-center justify-between gap-4 rounded-card border border-ink-line bg-ink-soft p-4 transition-colors hover:border-paper-dim"
              >
                <div className="min-w-0">
                  <p className="truncate font-display text-base font-semibold text-paper">{job.title}</p>
                  <p className="mt-0.5 text-sm text-paper-faint">
                    {job.company} · {TYPE_LABEL[job.type]}
                  </p>
                  {job.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {job.tags.map((tag) => (
                        <span
                          key={tag}
                          className={`rounded-md px-2 py-0.5 font-mono text-[11px] ${
                            userTags.has(tag) ? "bg-mint/15 text-mint" : "bg-ink-surface text-paper-faint"
                          }`}
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {score > 0 && (
                  <span className="shrink-0 rounded-full border border-amber-dim px-2.5 py-1 font-mono text-xs text-amber-soft">
                    {score}% cocok
                  </span>
                )}
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
