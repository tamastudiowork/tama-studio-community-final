import Link from "next/link";

export default function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/tsc-mark-square.png" alt="" className="h-9 w-9 object-contain" />
          <span className="font-display text-lg font-semibold tracking-tight">
            Tama Studio Community
          </span>
        </Link>

        <div className="grain overflow-hidden rounded-card border border-ink-line bg-ink-soft">
          <div className="flex items-center gap-1.5 border-b border-ink-line bg-ink-surface px-4 py-3">
            <span className="h-2.5 w-2.5 rounded-full bg-[#F45D5D]" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-soft" />
            <span className="h-2.5 w-2.5 rounded-full bg-mint" />
            <span className="ml-3 font-mono text-xs text-paper-faint">{title}</span>
          </div>
          <div className="px-6 py-7">
            <h1 className="font-display text-xl font-semibold text-paper">{title}</h1>
            <p className="mt-1.5 text-sm text-paper-dim">{subtitle}</p>
            <div className="mt-6">{children}</div>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-paper-dim">{footer}</p>
      </div>
    </main>
  );
}
