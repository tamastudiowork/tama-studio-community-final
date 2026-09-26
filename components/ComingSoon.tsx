export default function ComingSoon({
  title,
  tahap,
}: {
  title: string;
  tahap: string;
}) {
  return (
    <div className="mx-auto max-w-2xl">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-mint">
        {tahap}
      </p>
      <h1 className="mt-2 font-display text-2xl font-semibold text-paper sm:text-3xl">
        {title}
      </h1>
      <div className="mt-10 flex flex-col items-center justify-center rounded-card border border-dashed border-ink-line px-6 py-16 text-center">
        <span className="font-mono text-2xl text-paper-faint">⚙</span>
        <p className="mt-4 max-w-sm text-sm text-paper-dim">
          Bagian ini sedang dibangun di tahap pengembangan berikutnya.
        </p>
      </div>
    </div>
  );
}
