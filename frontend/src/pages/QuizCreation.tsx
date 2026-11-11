/** Page where an admin adds a quiz to a module, built in the editor or from a YAML file. */

import { useNavigate } from 'react-router-dom'
import ContentUploadPage from '@/components/admin/ContentUploadPage'
import QuizBuilder from '@/components/admin/QuizBuilder'
import type {
  BuilderProps,
  CreateContent,
} from '@/components/admin/upload-types'
import { parseQuizFile } from '@/lib/quiz-content'
import { saveQuiz } from '@/lib/quiz-save'

const createQuizFromFile: CreateContent = async (
  file,
  { module, csrfToken },
) => {
  const parsed = parseQuizFile(file.text)
  if ('error' in parsed) throw new Error(parsed.error)

  await saveQuiz(csrfToken, module.id, parsed.quiz)
}

// A module holds one quiz, so after building it the admin is returned to the
// module editor, which lists it, instead of being left on an empty builder.
function QuizBuilderPanel({ module, csrfToken }: BuilderProps) {
  const navigate = useNavigate()

  return (
    <QuizBuilder
      cancelTo={`/edit-module/${module.id}`}
      onSave={(quiz) => saveQuiz(csrfToken, module.id, quiz)}
      onSaved={() => void navigate(`/edit-module/${module.id}`)}
    />
  )
}

export default function QuizCreation() {
  return (
    <ContentUploadPage
      contentName="quiz"
      extensions={['.yaml', '.yml']}
      formatHint="A YAML file with a questions list. Each question needs a key, a type, and a prompt."
      Builder={QuizBuilderPanel}
      onCreate={createQuizFromFile}
    />
  )
}
