import { useState } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'

const GOOD = '#0ca30c'
const BAD = '#d03b3b'
const ACCENT = '#1d9e75'

export default function QuizCard({ questions, onDone }) {
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)

  const allAnswered = questions.every((q) => answers[q.id])
  const correctCount = questions.filter((q) => answers[q.id] === q.correct_id).length

  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-raised p-6">
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
        Knowledge check
      </p>
      <p className="mb-4 text-sm text-gray-400">
        {submitted
          ? 'Review your answers below. Your score is recorded when you finish.'
          : 'Answer every question, then submit. You get one attempt — answer honestly.'}
      </p>

      <div className="space-y-6">
        {questions.map((q, i) => (
          <div key={q.id}>
            <p className="mb-2 text-sm font-medium text-white">
              {i + 1}. {q.question}
            </p>
            <div className="space-y-1.5">
              {q.options.map((opt) => {
                const isPicked = answers[q.id] === opt.id
                const showResult = submitted
                const isCorrectOption = opt.id === q.correct_id
                let borderColor = 'var(--color-border-subtle)'
                let bg = 'transparent'
                if (showResult && isPicked) {
                  borderColor = isCorrectOption ? GOOD : BAD
                  bg = isCorrectOption ? 'rgba(12,163,12,0.1)' : 'rgba(208,59,59,0.1)'
                } else if (showResult && isCorrectOption) {
                  borderColor = GOOD
                } else if (isPicked) {
                  borderColor = ACCENT
                  bg = 'rgba(29,158,117,0.1)'
                }
                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={submitted}
                    onClick={() => setAnswers((a) => ({ ...a, [q.id]: opt.id }))}
                    className="flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors disabled:cursor-default"
                    style={{
                      borderColor,
                      backgroundColor: bg,
                      color: isPicked ? '#ffffff' : '#e5e7eb',
                    }}
                  >
                    {showResult && isPicked && (isCorrectOption ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: GOOD }} />
                    ) : (
                      <XCircle className="h-4 w-4 shrink-0" style={{ color: BAD }} />
                    ))}
                    {showResult && !isPicked && isCorrectOption && (
                      <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: GOOD }} />
                    )}
                    {opt.text}
                  </button>
                )
              })}
            </div>
            {submitted && answers[q.id] !== q.correct_id && (
              <p className="mt-1.5 text-xs text-gray-400">{q.explanation}</p>
            )}
          </div>
        ))}
      </div>

      {!submitted && (
        <button
          type="button"
          disabled={!allAnswered}
          onClick={() => setSubmitted(true)}
          className="mt-6 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          Submit answers
        </button>
      )}

      {submitted && (
        <div className="mt-6">
          <p className="mb-3 text-sm">
            <span className="font-semibold text-white">
              You scored {correctCount} / {questions.length}
            </span>
            <span className="text-gray-400">
              {' '}
              ({Math.round((correctCount / questions.length) * 100)}%)
            </span>
          </p>
          <button
            type="button"
            onClick={() => onDone(correctCount, questions.length)}
            className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
          >
            Finish module
          </button>
        </div>
      )}
    </div>
  )
}
