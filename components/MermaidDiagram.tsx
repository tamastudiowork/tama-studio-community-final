"use client";

import { useEffect, useRef, useState } from "react";

let mermaidIdCounter = 0;

export default function MermaidDiagram({ syntax }: { syntax: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      setError(null);
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({ startOnLoad: false, theme: "dark" });
        const id = `mermaid-${mermaidIdCounter++}`;
        const { svg } = await mermaid.render(id, syntax);
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch (err) {
        if (!cancelled) setError("Diagram tidak bisa dirender — sintaksnya mungkin tidak valid.");
      }
    }

    render();
    return () => {
      cancelled = true;
    };
  }, [syntax]);

  if (error) {
    return (
      <div className="rounded-md border border-[#F45D5D]/40 bg-[#F45D5D]/5 p-4 text-sm text-[#F45D5D]">
        {error}
        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap font-mono text-xs text-paper-faint">{syntax}</pre>
      </div>
    );
  }

  return <div ref={containerRef} className="overflow-x-auto rounded-md border border-ink-line bg-ink-soft p-4" />;
}
