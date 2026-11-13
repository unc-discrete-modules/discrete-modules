import {
  ApiError,
  createQuiz,
  getAdminQuiz,
  replaceQuiz,
  restoreQuiz,
} from '@/api/client'
import type { AdminQuiz, QuizInput } from '@/types/types'

const MAX_PROBLEMS_SHOWN = 3

async function findQuiz(moduleId: number): Promise<AdminQuiz | null> {
  try {
    return await getAdminQuiz(moduleId, true)
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  }
}

// A deleted quiz is only archived and the module can hold one quiz, so the
// new questions replace the archived quiz's and bring it back. Content is
// saved before the restore, so a failure part-way leaves it archived and a
// retry finishes the job.
async function addQuiz(csrfToken: string, moduleId: number, quiz: QuizInput) {
  const existing = await findQuiz(moduleId)
  if (!existing) return createQuiz(csrfToken, moduleId, quiz)

  if (!existing.archived) {
    throw new Error(
      'This module already has a quiz. Delete it in the module editor before adding a different one.',
    )
  }
  await replaceQuiz(csrfToken, existing.id, quiz)
  return restoreQuiz(csrfToken, existing.id)
}

// Server validation errors point at fields like body.questions.1.options;
// show them as "Question 2 (options): ..." so the quiz is easy to fix.
export function explainQuizError(error: unknown): unknown {
  if (
    !(error instanceof ApiError) ||
    error.code !== 'validation_error' ||
    !error.details?.length
  ) {
    return error
  }
  const problems = error.details.slice(0, MAX_PROBLEMS_SHOWN).map((detail) => {
    const [, field, index, ...rest] = detail.loc
    if (field !== 'questions' || typeof index !== 'number') {
      return detail.msg
    }
    const where = rest.length ? ` (${rest.join(' › ')})` : ''
    return `Question ${index + 1}${where}: ${detail.msg}`
  })
  const more = error.details.length - problems.length
  return new Error(
    `Fix the quiz. ${problems.join('. ')}${more > 0 ? `. And ${more} more.` : ''}`,
  )
}

// Rejects with an error whose message can be shown to the admin.
export async function saveQuiz(
  csrfToken: string,
  moduleId: number,
  quiz: QuizInput,
): Promise<void> {
  try {
    await addQuiz(csrfToken, moduleId, quiz)
  } catch (error) {
    throw explainQuizError(error)
  }
}
