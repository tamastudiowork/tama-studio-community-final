export default function Footer() {
  return (
    <footer className="border-t border-ink-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 text-sm text-paper-faint sm:flex-row sm:items-center sm:justify-between">
        <p className="font-mono">
          © {new Date().getFullYear()} Tama Studio Community
        </p>
        <p className="font-mono">Dibangun untuk programmer Indonesia yang baru mulai.</p>
      </div>
    </footer>
  );
}
