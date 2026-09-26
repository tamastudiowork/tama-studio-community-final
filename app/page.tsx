import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import TerminalHero from "@/components/TerminalHero";
import CommunityGraph from "@/components/CommunityGraph";
import DeveloperSection from "@/components/DeveloperSection";
import FaqAccordion from "@/components/FaqAccordion";
import SuggestionBox from "@/components/SuggestionBox";
import Reveal from "@/components/Reveal";

const FEATURES = [
  {
    icon: "💻",
    title: "Bagikan Kode",
    desc: "Repo public/private kayak GitHub — orang lain bisa lihat, fork, kasih bintang, dan diskusi lewat komentar.",
  },
  {
    icon: "👥",
    title: "Grup Belajar",
    desc: "Bikin atau gabung grup mirip Discord: chat, kirim file, voice channel, sampai role & mentor.",
  },
  {
    icon: "📚",
    title: "Buku Pemrograman",
    desc: "Baca buku gratis dari admin atau komunitas, bahkan bikin & modifikasi buku bareng-bareng (sistem wiki).",
  },
  {
    icon: "🧪",
    title: "Playground Online",
    desc: "Tulis dan jalanin kode langsung di browser, gak perlu install apa-apa di laptop kamu.",
  },
  {
    icon: "🏆",
    title: "Roadmap & Sertifikat",
    desc: "Ikutin jalur belajar terstruktur, kumpulin XP, dan dapetin sertifikat begitu satu jalur selesai.",
  },
  {
    icon: "☕",
    title: "Dukung Developer",
    desc: "Suka karya orang lain? Kasih bintang atau traktir kopi — programmer pemula jadi makin semangat berkarya.",
  },
];

const STATS = [
  { label: "Filosofi", value: "Open Source" },
  { label: "Biaya", value: "Gratis" },
  { label: "Cocok untuk", value: "Pemula" },
  { label: "Terinspirasi", value: "GitHub + Discord" },
];

export default function LandingPage() {
  return (
    <>
      <Navbar />

      <main className="overflow-x-clip">
        {/* Hero */}
        <section className="relative mx-auto grid max-w-6xl gap-12 px-5 py-16 sm:py-24 lg:grid-cols-2 lg:items-center">
          {/* decorative animated glow blobs */}
          <div
            aria-hidden
            className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 animate-float rounded-full bg-mint/10 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 top-32 h-64 w-64 animate-float rounded-full bg-amber/10 blur-3xl [animation-delay:2s]"
          />

          <Reveal>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-mint animate-pulse-glow">
              Belajar · Berkarya · Berkolaborasi
            </p>
            <h1 className="mt-4 max-w-lg font-display text-4xl font-semibold leading-[1.1] text-paper sm:text-5xl">
              Tempat programmer pemula punya repo, buku, dan grup pertamanya.
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-paper-dim">
              TSC gabungin cara kerja GitHub, obrolan Discord, dan buku
              belajar coding gratis — dibuat khusus supaya nggak ada yang
              merasa tertinggal.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/register"
                className="rounded-md bg-amber px-6 py-3 text-sm font-semibold text-ink shadow-glow transition-transform hover:-translate-y-0.5 hover:scale-[1.03]"
              >
                Mulai gratis
              </Link>
              <a
                href="#fitur"
                className="rounded-md border border-ink-line px-6 py-3 text-sm font-medium text-paper transition-colors hover:border-paper-dim hover:bg-ink-soft"
              >
                Lihat fitur
              </a>
            </div>

            {/* quick stat row */}
            <dl className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {STATS.map((s, i) => (
                <Reveal key={s.label} delay={i * 80} className="border-l-2 border-ink-line pl-3">
                  <dt className="font-mono text-[11px] uppercase tracking-wide text-paper-faint">
                    {s.label}
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-paper">{s.value}</dd>
                </Reveal>
              ))}
            </dl>
          </Reveal>

          <Reveal delay={150} className="flex justify-center lg:justify-end">
            <TerminalHero />
          </Reveal>
        </section>

        {/* Apa itu TSC — info section, jadi hal pertama yang jelasin platform */}
        <section id="fitur" className="border-y border-ink-line bg-ink-soft/30 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-5">
            <Reveal>
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-mint">
                Apa itu Tama Studio Community?
              </p>
              <h2 className="mt-3 max-w-2xl font-display text-2xl font-semibold text-paper sm:text-3xl">
                Satu tempat buat ngoding, belajar, dan nemu teman — gratis
                dan open source.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-paper-dim">
                TSC dibuat buat programmer pemula yang mau belajar bareng,
                bikin proyek bareng orang lain, atau sekadar lihat karya
                programmer lain buat referensi. Semua fitur di bawah ini
                bisa dipakai gratis, selamanya.
              </p>
            </Reveal>

            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f, i) => (
                <Reveal
                  key={f.title}
                  delay={i * 90}
                  className="group rounded-card border border-ink-line bg-ink p-6 transition-all hover:-translate-y-1 hover:border-amber/40 hover:shadow-glow"
                >
                  <span className="text-2xl transition-transform duration-300 group-hover:scale-125 group-hover:rotate-6 inline-block">
                    {f.icon}
                  </span>
                  <h3 className="mt-4 font-display text-lg font-semibold text-paper">
                    {f.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-paper-dim">{f.desc}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Community graph strip */}
        <section className="border-b border-ink-line bg-ink-soft/50 py-14">
          <div className="mx-auto max-w-6xl px-5">
            <Reveal>
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-mint">
                Aktivitas komunitas
              </p>
              <h2 className="mt-3 max-w-lg font-display text-2xl font-semibold text-paper sm:text-3xl">
                Setiap kotak hijau itu satu orang yang baru saja belajar
                sesuatu.
              </h2>
            </Reveal>
            <Reveal delay={120} className="mt-8 overflow-x-auto">
              <CommunityGraph />
            </Reveal>
          </div>
        </section>

        <Reveal>
          <DeveloperSection />
        </Reveal>
        <Reveal>
          <FaqAccordion />
        </Reveal>
        <Reveal>
          <SuggestionBox />
        </Reveal>
      </main>

      <Footer />
    </>
  );
}
