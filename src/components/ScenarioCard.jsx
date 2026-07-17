import { useState } from 'react'

const GOOD = '#0ca30c'
const BAD = '#d03b3b'

export default function ScenarioCard({ scenario, onContinue }) {
  const [pickedId, setPickedId] = useState(null)

  const picked = scenario.choices.find((c) => c.id === pickedId)

  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-raised p-6">
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">Scenario</p>
      <p className="mb-4 text-sm text-white">{scenario.prompt}</p>

      <div className="space-y-2">
        {scenario.choices.map((choice) => {
          const isPicked = choice.id === pickedId
          return (
            <button
              key={choice.id}
              type="button"
              disabled={pickedId !== null}
              onClick={() => setPickedId(choice.id)}
              className="w-full rounded-lg border px-3 py-2.5 text-left text-sm transition-colors disabled:cursor-default"
              style={{
                borderColor: isPicked ? (choice.correct ? GOOD : BAD) : 'var(--color-border-subtle)',
                backgroundColor: isPicked ? (choice.correct ? 'rgba(12,163,12,0.1)' : 'rgba(208,59,59,0.1)') : 'transparent',
                color: pickedId === null ? '#e5e7eb' : isPicked ? '#ffffff' : '#6b7280',
              }}
            >
              {choice.text}
            </button>
          )
        })}
      </div>

      {picked && (
        <div className="mt-4 rounded-lg border border-border-subtle bg-surface p-3 text-sm">
          <p className="font-medium" style={{ color: picked.correct ? GOOD : BAD }}>
            {picked.correct ? 'Correct' : 'Not quite'}
          </p>
          <p className="mt-1 text-gray-400">{picked.explanation}</p>
        </div>
      )}

      {picked && (
        <button
          type="button"
          onClick={onContinue}
          className="mt-4 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
        >
          Continue to quiz
        </button>
      )}
    </div>
  )
}
