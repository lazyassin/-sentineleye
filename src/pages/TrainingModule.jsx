import { useEffect, useState } from 'react'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { ArrowLeft, Clock } from 'lucide-react'
import { fetchModule, completeModule } from '../lib/training'
import { renderContentBlocks, splitBold } from '../lib/markdown'
import ScenarioCard from '../components/ScenarioCard'
import QuizCard from '../components/QuizCard'

function renderInline(text, keyPrefix) {
  return splitBold(text).map((part, i) =>
    typeof part === 'string' ? (
      <span key={`${keyPrefix}-${i}`}>{part}</span>
    ) : (
      <strong key={`${keyPrefix}-${i}`}>{part.bold}</strong>
    ),
  )
}

function ContentBlock({ block }) {
  switch (block.type) {
    case 'h1':
      return <h1 className="mb-2 text-xl font-semibold text-white">{block.text}</h1>
    case 'h2':
      return <h2 className="mb-2 mt-5 text-base font-semibold text-white">{block.text}</h2>
    case 'ul':
      return (
        <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-gray-300">
          {block.items.map((item, i) => (
            <li key={i}>{renderInline(item, `${block.key}-${i}`)}</li>
          ))}
        </ul>
      )
    case 'ol':
      return (
        <ol className="list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-gray-300">
          {block.items.map((item, i) => (
            <li key={i}>{renderInline(item, `${block.key}-${i}`)}</li>
          ))}
        </ol>
      )
    default:
      return <p className="text-sm leading-relaxed text-gray-300">{renderInline(block.text, block.key)}</p>
  }
}

export default function TrainingModule() {
  const { moduleId } = useParams()
  const { profile } = useOutletContext()
  const navigate = useNavigate()

  const [module, setModule] = useState(null)
  const [error, setError] = useState(null)
  const [step, setStep] = useState('content')

  useEffect(() => {
    fetchModule(moduleId).then(setModule).catch((err) => setError(err.message))
  }, [moduleId])

  const handleDone = async (score, total) => {
    await completeModule(profile.employee_id, moduleId, score, total)
    navigate('/')
  }

  return (
    <>
      <button
        onClick={() => navigate('/')}
        className="mb-4 flex items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-accent"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to My Training
      </button>

      {error && (
        <div className="mb-6 rounded-lg border border-red-900/50 bg-red-950/50 px-4 py-3 text-sm text-red-400">
          Couldn't load this module: {error}
        </div>
      )}

      {!module && !error && <p className="text-sm text-gray-500">Loading…</p>}

      {module && (
        <>
          <div className="mb-6">
            <h1 className="text-lg font-semibold text-white">{module.title}</h1>
            <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
              <Clock className="h-3 w-3" />
              {module.duration_minutes} min · {module.category}
            </p>
          </div>

          {step === 'content' && (
            <div className="rounded-2xl border border-border-subtle bg-surface-raised p-6">
              <div className="space-y-3">
                {renderContentBlocks(module.content_md).map((block) => (
                  <ContentBlock key={block.key} block={block} />
                ))}
              </div>
              <button
                type="button"
                onClick={() => setStep('scenario')}
                className="mt-6 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
              >
                Start scenario
              </button>
            </div>
          )}

          {step === 'scenario' && (
            <ScenarioCard scenario={module.scenario} onContinue={() => setStep('quiz')} />
          )}

          {step === 'quiz' && <QuizCard questions={module.quiz} onDone={handleDone} />}
        </>
      )}
    </>
  )
}
