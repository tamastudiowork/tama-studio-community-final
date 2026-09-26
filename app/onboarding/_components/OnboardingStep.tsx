export default function OnboardingStep({
  step,
  totalSteps,
  title,
  subtitle,
  children,
}: {
  step: number;
  totalSteps: number;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="w-full max-w-md">
      <div className="mb-6 flex items-center gap-1.5">
        {Array.from({ length: totalSteps }, (_, i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full ${i < step ? "bg-amber" : "bg-ink-line"}`}
          />
        ))}
      </div>

      <p className="font-mono text-xs uppercase tracking-[0.2em] text-mint">
        Langkah {step} dari {totalSteps}
      </p>
      <h1 className="mt-2 font-display text-2xl font-semibold text-paper">{title}</h1>
      <p className="mt-1.5 text-sm text-paper-dim">{subtitle}</p>

      <div className="mt-6">{children}</div>
    </div>
  );
}
