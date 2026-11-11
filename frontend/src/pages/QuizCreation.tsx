/** Page where an admin adds a quiz to a module from a YAML file. */

import ContentUploadPage from '@/components/admin/ContentUploadPage'
import type { CreateContent } from '@/components/admin/upload-types'
import {
  ApiError,
  createQuiz,
  getAdminQuiz,
  replaceQuiz,
  restoreQuiz,
} from '@/api/client'
import { parseQuizFile } from '@/lib/quiz-content'
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
// uploaded file replaces the archived quiz's questions and brings it back.
// Content is saved before the restore, so a failure part-way leaves it
// archived and a retry finishes the job.
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
// show them as "Question 2 (options): ..." so the file is easy to fix.
function explain(error: unknown): unknown {
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
    `Fix the quiz file. ${problems.join('. ')}${more > 0 ? `. And ${more} more.` : ''}`,
  )
}

const createQuizFromFile: CreateContent = async (
  file,
  { module, csrfToken },
) => {
  const parsed = parseQuizFile(file.text)
  if ('error' in parsed) throw new Error(parsed.error)

  try {
    await addQuiz(csrfToken, module.id, parsed.quiz)
  } catch (error) {
    throw explain(error)
  }
}

export default function QuizCreation() {
  return (
    <ContentUploadPage
      contentName="quiz"
      extensions={['.yaml', '.yml']}
      formatHint="A YAML file with a questions list. Each question needs a key, a type, and a prompt."
      onCreate={createQuizFromFile}
    />
  )
}
