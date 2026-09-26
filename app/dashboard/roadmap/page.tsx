"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/useAuth";
import { SKILL_TREE, SkillTreeService, type SkillStatus } from "@/lib/skilltree";

const STATUS_STYLE: Record<SkillStatus, string> = {
  todo: "border-ink-line text-paper-faint",
  learning: "border-amber bg-amber/10 text-amber-soft",
  done: "border-mint bg-mint/10 text-mint",
};

const STATUS_LABEL: Record<SkillStatus, string> = {
  todo: "Belum mulai",
  learning: "Sedang dipelajari",
  done: "Selesai",
};

const NEXT_STATUS: Record<SkillStatus, SkillStatus> = {
  todo: "learning",
  learning: "done",
  done: "todo",
};

export default function RoadmapPage() {
  const { user } = useAuth();
  const [progress, setProgress] = useState<Record<string, SkillStatus>>({});

  useEffect(() => {
    if (!user) return;
    const unsub = SkillTreeService.subscribeProgress(user.uid, setProgress);
    return unsub;
  }, [user]);

  const tracks = useMemo(() => {
    const map = new Map<string, typeof SKILL_TREE>();
    for (const node of SKILL_TREE) {
      if (!map.has(node.track)) map.set(node.track, []);
      map.get(node.track)!.push(node);
    }
    return Array.from(map.entries());
  }, []);

  async function handleAdvance(skillId: string) {
    if (!user) return;
    const current = progress[skillId] ?? "todo";
    await SkillTreeService.setStatus(user.uid, skillId, NEXT_STATUS[current]);
  }

  function isLocked(node: (typeof SKILL_TREE)[number]) {
    return node.requires.some((req) => (progress[req] ?? "todo") !== "done");
  }

  const totalDone = SKILL_TREE.filter((n) => progress[n.id] === "done").length;

  return (
    <div className="mx-auto max-w-3xl">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-mint">Roadmap</p>
      <h1 className="mt-2 font-display text-2xl font-semibold text-paper sm:text-3xl">
        Skill Tree
      </h1>
      <p className="mt-1 text-sm text-paper-dim">
        Klik sebuah keahlian buat ganti status: belum mulai → sedang dipelajari → selesai. Keahlian
        terkunci sampai prasyaratnya selesai.
      </p>
      <p className="mt-2 font-mono text-xs text-paper-faint">
        {totalDone}/{SKILL_TREE.length} keahlian selesai
      </p>

      <div className="mt-8 space-y-8">
        {tracks.map(([track, nodes]) => (
          <div key={track}>
            <p className="font-display text-base font-semibold text-paper">{track}</p>
            <div className="mt-3 space-y-2">
              {nodes.map((node) => {
                const status = progress[node.id] ?? "todo";
                const locked = isLocked(node);
                return (
                  <button
                    key={node.id}
                    onClick={() => !locked && handleAdvance(node.id)}
                    disabled={locked}
                    className={`flex w-full items-center justify-between rounded-md border px-4 py-3 text-left text-sm transition-colors ${
                      locked ? "border-ink-line text-paper-faint opacity-50" : STATUS_STYLE[status]
                    }`}
                  >
                    <span>{node.label}</span>
                    <span className="font-mono text-xs">
                      {locked ? "🔒 Terkunci" : STATUS_LABEL[status]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
