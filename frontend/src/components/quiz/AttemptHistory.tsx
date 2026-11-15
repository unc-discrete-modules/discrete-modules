import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { getQuizAttempt } from '@/api/client'
import { ErrorState, LoadingState } from '@/components/RequestState'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { useQuizAttempts } from '@/hooks/use-quiz-attempts'
import { bestAttempt } from '@/lib/quiz-answers'
import type { AttemptDetail, AttemptSummary } from '@/types/types'

type AttemptHistoryProps = {
  quizId: number
  onReview: (attempt: AttemptDetail) => void
}

function scoreText(attempt: AttemptSummary) {
  return attempt.max_score === 0
    ? 'No auto-graded questions'
    : `${attempt.score} of ${attempt.max_score}`
}

export default function AttemptHistory({
  quizId,
  onReview,
}: AttemptHistoryProps) {
  const { attempts, loading, error, retry } = useQuizAttempts(quizId)
  const [open, setOpen] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const [reviewError, setReviewError] = useState<string | null>(null)

  async function review(attemptId: number) {
    setReviewing(true)
    setReviewError(null)
    try {
      onReview(await getQuizAttempt(quizId, attemptId))
    } catch {
      setReviewError('Unable to load this attempt. Please try again.')
      setReviewing(false)
    }
  }

  const best = attempts ? bestAttempt(attempts) : undefined

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="group/collapsible mt-6 border-y border-slate-200"
    >
      <CollapsibleTrigger className="flex w-full items-center gap-2 py-3 text-left text-lg font-medium text-slate-700">
        <ChevronRight
          aria-hidden
          className="size-5 shrink-0 transition-transform duration-150 group-data-open/collapsible:rotate-90"
        />
        Past attempts
        {attempts ? ` (${attempts.length})` : null}
        {best ? (
          <span className="ml-auto text-base font-normal text-slate-500">
            Best score: {scoreText(best)}
          </span>
        ) : null}
      </CollapsibleTrigger>
      <CollapsibleContent className="pb-4">
        {loading ? <LoadingState message="Loading past attempts..." /> : null}
        {error ? <ErrorState error={error} retry={retry} /> : null}
        {attempts?.length === 0 ? (
          <p className="pl-7 text-base text-slate-500">No attempts yet.</p>
        ) : null}
        {attempts?.length ? (
          <ul className="space-y-2 pl-7">
            {attempts.map((attempt, index) => (
              <li
                key={attempt.id}
                className="flex items-center gap-4 text-base text-slate-700"
              >
                <span className="text-slate-500">
                  {new Date(attempt.submitted_at * 1000).toLocaleString()}
                </span>
                <span className="font-medium">{scoreText(attempt)}</span>
                {index === 0 ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="ml-auto"
                    disabled={reviewing}
                    onClick={() => void review(attempt.id)}
                  >
                    {reviewing ? 'Loading…' : 'Review feedback'}
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
        {reviewError ? (
          <p role="alert" className="mt-2 pl-7 text-base text-destructive">
            {reviewError}
          </p>
        ) : null}
      </CollapsibleContent>
    </Collapsible>
  )
}
