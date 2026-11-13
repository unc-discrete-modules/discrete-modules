/** A question shown as one draggable row, while a quiz's questions are reordered. */

import { GripVertical } from 'lucide-react'
import { useSortable } from '@dnd-kit/react/sortable'
import { QUESTION_TYPE_LABELS, type QuestionType } from '@/lib/quiz-draft'

type QuestionReorderRowProps = {
  id: string
  index: number
  type: QuestionType
  prompt: string
  disabled?: boolean
}

// The first line is enough to tell questions apart.
function summarize(prompt: string) {
  const firstLine = prompt.trim().split('\n')[0]
  return firstLine || '(no question text yet)'
}

export default function QuestionReorderRow({
  id,
  index,
  type,
  prompt,
  disabled = false,
}: QuestionReorderRowProps) {
  const { ref, handleRef, isDragging } = useSortable({ id, index, disabled })
  const number = index + 1

  return (
    <div
      ref={ref}
      className={`flex items-center gap-3 rounded-md border-3 bg-white px-5 py-2 ${isDragging ? 'opacity-50' : ''}`}
    >
      <button
        ref={handleRef}
        type="button"
        aria-label={`Reorder question ${number}`}
        className="cursor-grab touch-none rounded-md p-1 text-muted-navy active:cursor-grabbing"
      >
        <GripVertical aria-hidden="true" size={20} />
      </button>
      <p className="shrink-0 font-semibold text-muted-navy">
        Question {number}: {QUESTION_TYPE_LABELS[type]}
      </p>
      <p className="min-w-0 truncate text-muted-foreground">
        {summarize(prompt)}
      </p>
    </div>
  )
}
