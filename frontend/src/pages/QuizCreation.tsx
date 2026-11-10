/** Page where an admin adds a quiz to a module from a YAML file. */

import ContentUploadPage from '@/components/admin/ContentUploadPage'

export default function QuizCreation() {
  return (
    <ContentUploadPage
      contentName="quiz"
      extensions={['.yaml', '.yml']}
      formatHint="A YAML file with a questions list. Each question needs a key, a type, and a prompt."
    />
  )
}
