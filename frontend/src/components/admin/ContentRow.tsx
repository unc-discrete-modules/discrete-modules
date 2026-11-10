// Row displayed in module editing for quizzes and lessons.

import { useRef, useState } from 'react'
import DeleteConfirmation from './DeleteConfirmation'
import { Link } from 'react-router-dom'
import { GripVertical } from 'lucide-react'
import { useSortable } from '@dnd-kit/react/sortable'

type ContentProps = {
  id: number
  index: number
  name: string
  contentType?: 'lesson' | 'quiz'
  reordering: boolean
  disabled?: boolean
}

export default function ContentRow({
  id,
  index,
  name,
  contentType = 'lesson',
  reordering,
  disabled = false,
}: ContentProps) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const deleteAnchorRef = useRef<HTMLDivElement>(null)
  const { ref, handleRef, isDragging } = useSortable({
    id,
    index,
    disabled: !reordering || disabled,
  })

  return (
    <div
      ref={ref}
      className={`flex justify-between py-2 px-5 border-3 rounded-md ${isDragging ? 'opacity-50' : ''}`}
    >
      {reordering && (
        <button
          ref={handleRef}
          type="button"
          aria-label={`Reorder ${contentType} ${name}`}
          disabled={disabled}
          className="mr-2 cursor-grab touch-none rounded-md p-1 text-muted-navy active:cursor-grabbing disabled:cursor-not-allowed"
        >
          <GripVertical aria-hidden="true" size={20} />
        </button>
      )}
      <p className="text-muted-navy text-md font-semibold">{name}</p>
      <div className="space-x-3">
        <Link
          to={`/edit-lesson/${id}`}
          className="text-light-blue font-bold hover:saturate-120 hover:scale-102"
        >
          Edit
        </Link>
        <span className="text-gray-300 font-bold">|</span>
        <div ref={deleteAnchorRef} className="inline-block">
          <DeleteConfirmation
            deleteType="content"
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            onConfirm={() => setDeleteOpen(false)}
            confirming={false}
            error={null}
            anchor={deleteAnchorRef}
            trigger={
              <button
                type="button"
                className="text-delete-red font-bold hover:saturate-120 hover:scale-102 cursor-pointer"
              >
                Delete
              </button>
            }
          />
        </div>
      </div>
    </div>
  )
}
