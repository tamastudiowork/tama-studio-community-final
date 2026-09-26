"use client";

import { useState } from "react";

const faqs = [
  {
    q: "Apakah TSC gratis?",
    a: "Ya. Belajar dari buku komunitas, bikin repo, dan gabung grup semuanya gratis — TSC dibangun dengan semangat open source.",
  },
  {
    q: "Saya belum pernah coding sama sekali, boleh gabung?",
    a: "Justru itu targetnya. Ada roadmap belajar dari nol dan grup khusus pemula yang siap bantu tanpa menghakimi.",
  },
  {
    q: "Bedanya sama GitHub apa?",
    a: "TSC gabungin repo kode ala GitHub dengan buku pembelajaran dan grup diskusi real-time dalam satu tempat, jadi kamu belajar, bikin, dan diskusi tanpa pindah-pindah aplikasi.",
  },
  {
    q: "Kode yang saya publish bisa disalin orang lain?",
    a: "Tergantung kamu. Kode publik boleh di-fork dan didiskusikan orang lain; kode privat hanya bisa dilihat lewat link dan tidak bisa diduplikat.",
  },
];

export default function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="mx-auto max-w-3xl px-5 py-20">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-mint">
        Pertanyaan umum
      </p>
      <h2 className="mt-3 font-display text-3xl font-semibold text-paper sm:text-4xl">
        FAQ
      </h2>

      <div className="mt-8 divide-y divide-ink-line border-y border-ink-line">
        {faqs.map((item, i) => {
          const isOpen = openIndex === i;
          return (
            <div key={item.q}>
              <button
                onClick={() => setOpenIndex(isOpen ? null : i)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-4 py-5 text-left"
              >
                <span className="font-medium text-paper">{item.q}</span>
                <span
                  className={`font-mono text-amber transition-transform ${
                    isOpen ? "rotate-45" : ""
                  }`}
                >
                  +
                </span>
              </button>
              {isOpen && (
                <p className="pb-5 text-sm leading-relaxed text-paper-dim">
                  {item.a}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
