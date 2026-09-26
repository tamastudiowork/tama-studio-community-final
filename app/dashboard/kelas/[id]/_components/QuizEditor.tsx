"use client";

import type { QuizQuestion } from "@/lib/books";

export default function QuizEditor({
  quiz,
  onChange,
}: {
  quiz: QuizQuestion[];
  onChange: (quiz: QuizQuestion[]) => void;
}) {
  function addQuestion() {
    onChange([...quiz, { question: "", options: ["", ""], correctIndex: 0 }]);
  }

  function updateQuestion(qi: number, patch: Partial<QuizQuestion>) {
    onChange(quiz.map((q, i) => (i === qi ? { ...q, ...patch } : q)));
  }

  function removeQuestion(qi: number) {
    onChange(quiz.filter((_, i) => i !== qi));
  }

  function addOption(qi: number) {
    const q = quiz[qi];
    updateQuestion(qi, { options: [...q.options, ""] });
  }

  function updateOption(qi: number, oi: number, value: string) {
    const q = quiz[qi];
    const options = q.options.map((o, i) => (i === oi ? value : o));
    updateQuestion(qi, { options });
  }

  function removeOption(qi: number, oi: number) {
    const q = quiz[qi];
    if (q.options.length <= 2) return; // minimal 2 pilihan
    const options = q.options.filter((_, i) => i !== oi);
    const correctIndex = q.correctIndex >= options.length ? 0 : q.correctIndex;
    updateQuestion(qi, { options, correctIndex });
  }

  return (
    <div className="mt-8 rounded-card border border-dashed border-ink-line p-5">
      <div className="flex items-center justify-between">
        <p className="font-display text-base font-semibold text-paper">Quiz bab ini (opsional)</p>
        <button
          type="button"
          onClick={addQuestion}
          className="rounded-md border border-ink-line px-3 py-1.5 text-xs text-paper-dim hover:border-paper-dim"
        >
          + Pertanyaan
        </button>
      </div>

      {quiz.length === 0 && (
        <p className="mt-3 text-sm text-paper-faint">
          Belum ada pertanyaan. Kosongkan saja kalau bab ini tidak perlu quiz.
        </p>
      )}

      <div className="mt-4 space-y-6">
        {quiz.map((q, qi) => (
          <div key={qi} className="rounded-md border border-ink-line bg-ink p-4">
            <div className="flex items-start justify-between gap-3">
              <input
                value={q.question}
                onChange={(e) => updateQuestion(qi, { question: e.target.value })}
                placeholder={`Pertanyaan ${qi + 1}`}
                className="w-full rounded-md border border-ink-line bg-ink-soft px-3 py-2 text-sm text-paper outline-none focus:border-amber"
              />
              <button
                type="button"
                onClick={() => removeQuestion(qi)}
                className="shrink-0 rounded-md border border-ink-line px-2.5 py-2 text-xs text-paper-faint hover:border-[#F45D5D] hover:text-[#F45D5D]"
              >
                Hapus
              </button>
            </div>

            <div className="mt-3 space-y-2">
              {q.options.map((opt, oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`correct-${qi}`}
                    checked={q.correctIndex === oi}
                    onChange={() => updateQuestion(qi, { correctIndex: oi })}
                    title="Tandai sebagai jawaban benar"
                  />
                  <input
                    value={opt}
                    onChange={(e) => updateOption(qi, oi, e.target.value)}
                    placeholder={`Pilihan ${oi + 1}`}
                    className="flex-1 rounded-md border border-ink-line bg-ink-soft px-3 py-1.5 text-sm text-paper outline-none focus:border-amber"
                  />
                  <button
                    type="button"
                    onClick={() => removeOption(qi, oi)}
                    className="shrink-0 text-xs text-paper-faint hover:text-[#F45D5D]"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addOption(qi)}
                className="text-xs text-paper-faint hover:text-paper"
              >
                + Tambah pilihan
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
