/** Page where an admin adds a lesson to a module from a Markdown file. */

import ContentUploadPage from '@/components/admin/ContentUploadPage'

export default function LessonCreation() {
  return (
    <ContentUploadPage
      contentName="lesson"
      extensions={['.md']}
      formatHint="A Markdown file that starts with a front matter block containing a title and an optional video_url."
    />
  )
}
