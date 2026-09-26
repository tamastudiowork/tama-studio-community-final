"use client";

import { useState } from "react";
import type { QuizQuestion } from "@/lib/books";

export default function QuizBlock({
  quiz,
  previousScore,
  onSubmit,
}: {
  quiz: QuizQuestion[];
  previousScore?: number;
  onSubmit: (scoreFraction: number) => void;
}) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const allAnswered = quiz.every((_, i) => answers[i] !== undefined);
  const correctCount = quiz.filter((q, i) => answers[i] === q.correctIndex).length;
  const scoreFraction = quiz.length ? correctCount / quiz.length : 0;

  function handleSubmit() {
    setSubmitted(true);
    onSubmit(scoreFraction);
  }

  return (
    <div className="mt-8 rounded-card border border-ink-line bg-ink-soft p-5">
      <div className="flex items-center justify-between">
        <p className="font-display text-base font-semibold text-paper">Quiz bab ini</p>
        {previousScore !== undefined && previousScore > 0 && !submitted && (
          <span className="font-mono text-xs text-paper-faint">
            Skor terbaik sebelumnya: {Math.round(previousScore * 100)}%
          </span>
        )}
      </div>

      <div className="mt-4 space-y-5">
        {quiz.map((q, qi) => (
          <div key={qi}>
            <p className="text-sm font-medium text-paper">
              {qi + 1}. {q.question}
            </p>
            <div className="mt-2 space-y-1.5">
              {q.options.map((opt, oi) => {
                const selected = answers[qi] === oi;
                const showResult = submitted;
                const isCorrect = oi === q.correctIndex;
                let stateClass = "border-ink-line";
                if (showResult && isCorrect) stateClass = "border-mint text-mint";
                else if (showResult && selected && !isCorrect) stateClass = "border-[#F45D5D] text-[#F45D5D]";
                else if (selected) stateClass = "border-amber text-amber-soft";

                return (
                  <button
                    key={oi}
                    type="button"
                    disabled={submitted}
                    onClick={() => setAnswers((a) => ({ ...a, [qi]: oi }))}
                    className={`block w-full rounded-md border px-3 py-2 text-left text-sm text-paper-dim transition-colors ${stateClass} disabled:cursor-default`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {!submitted ? (
        <button
          onClick={handleSubmit}
          disabled={!allAnswered}
          className="mt-5 rounded-md bg-amber px-5 py-2 text-sm font-semibold text-ink disabled:opacity-50"
        >
          Kumpulkan jawaban
        </button>
      ) : (
        <p className="mt-5 font-mono text-sm text-paper">
          Hasil: {correctCount}/{quiz.length} benar ({Math.round(scoreFraction * 100)}%)
        </p>
      )}
    </div>
  );
}
