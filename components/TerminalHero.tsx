"use client";

import { useEffect, useState } from "react";

type Line = { prompt: string; text: string; result?: string };

const SCRIPT: Line[] = [
  { prompt: "~", text: "tama join --sebagai pemula" },
  { prompt: "tsc", text: "clone belajar/dasar-html", result: "✓ 12 bab siap dipelajari" },
  { prompt: "tsc", text: "fork proyek/landing-page-keren", result: "✓ ter-fork ke akunmu" },
  { prompt: "tsc", text: "grup join #frontend-pemula", result: "✓ bergabung, 214 anggota online" },
];

export default function TerminalHero() {
  const [lineIndex, setLineIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    if (lineIndex >= SCRIPT.length) return;
    const current = SCRIPT[lineIndex];

    if (charIndex < current.text.length) {
      const t = setTimeout(() => setCharIndex((c) => c + 1), 38);
      return () => clearTimeout(t);
    }

    if (!showResult) {
      const t = setTimeout(() => setShowResult(true), 260);
      return () => clearTimeout(t);
    }

    const t = setTimeout(() => {
      setLineIndex((i) => i + 1);
      setCharIndex(0);
      setShowResult(false);
    }, 700);
    return () => clearTimeout(t);
  }, [charIndex, lineIndex, showResult]);

  return (
    <div className="grain w-full max-w-md overflow-hidden rounded-card border border-ink-line bg-ink-soft shadow-2xl">
      <div className="flex items-center gap-1.5 border-b border-ink-line bg-ink-surface px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-[#F45D5D]" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-soft" />
        <span className="h-2.5 w-2.5 rounded-full bg-mint" />
        <span className="ml-3 font-mono text-xs text-paper-faint">
          tama-studio — zsh
        </span>
      </div>
      <div className="min-h-[220px] space-y-2.5 px-4 py-5 font-mono text-[13px] leading-relaxed">
        {SCRIPT.slice(0, lineIndex).map((l, i) => (
          <div key={i}>
            <p>
              <span className="text-mint">{l.prompt}</span>
              <span className="text-paper-faint"> ❯ </span>
              <span className="text-paper">{l.text}</span>
            </p>
            {l.result && <p className="pl-4 text-amber-soft">{l.result}</p>}
          </div>
        ))}

        {lineIndex < SCRIPT.length && (
          <div>
            <p>
              <span className="text-mint">{SCRIPT[lineIndex].prompt}</span>
              <span className="text-paper-faint"> ❯ </span>
              <span className="text-paper">
                {SCRIPT[lineIndex].text.slice(0, charIndex)}
              </span>
              <span className="inline-block w-[7px] translate-y-[1px] animate-blink bg-amber align-middle">
                &nbsp;
              </span>
            </p>
            {showResult && SCRIPT[lineIndex].result && (
              <p className="pl-4 text-amber-soft">{SCRIPT[lineIndex].result}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
