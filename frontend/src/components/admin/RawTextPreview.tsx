/** Shows an uploaded file's text as is, for content with no richer preview. */

import type { PreviewProps } from './upload-types'

const PREVIEW_CHARACTERS = 2_000

export default function RawTextPreview({ file }: PreviewProps) {
  const truncated = file.text.length > PREVIEW_CHARACTERS

  return (
    <pre
      aria-label="File contents"
      tabIndex={0}
      className="max-h-64 overflow-auto rounded-sm border-3 border-stone-200 bg-white p-3 text-sm whitespace-pre-wrap"
    >
      {truncated ? `${file.text.slice(0, PREVIEW_CHARACTERS)}\n…` : file.text}
    </pre>
  )
}
