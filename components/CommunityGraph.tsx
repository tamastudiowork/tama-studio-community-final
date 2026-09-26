// A quiet nod to the contribution graph that Tahap 2 will ship for real —
// here it's decorative, seeded deterministically so server and client match.
function seededLevel(i: number) {
  const v = Math.sin(i * 12.9898) * 43758.5453;
  const f = v - Math.floor(v);
  return Math.floor(f * 4); // 0..3
}

const LEVEL_COLOR = ["bg-ink-surface", "bg-mint-dim", "bg-mint/60", "bg-mint"];

export default function CommunityGraph() {
  const cells = Array.from({ length: 140 }, (_, i) => seededLevel(i));

  return (
    <div className="grid grid-cols-[repeat(20,minmax(0,1fr))] gap-1 sm:grid-cols-[repeat(28,minmax(0,1fr))]">
      {cells.map((level, i) => (
        <span key={i} className={`commit-cell ${LEVEL_COLOR[level]}`} />
      ))}
    </div>
  );
}
