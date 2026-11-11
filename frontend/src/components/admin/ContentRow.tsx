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
  // Where the Edit link goes.
  editTo: string
  reordering: boolean
  disabled?: boolean
  // A rejection's message is shown in the confirmation popup.
  onDelete: () => Promise<void>
}

export default function ContentRow({
  id,
  index,
  name,
  contentType = 'lesson',
  editTo,
  reordering,
  disabled = false,
  onDelete,
}: ContentProps) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const deleteAnchorRef = useRef<HTMLDivElement>(null)
  const { ref, handleRef, isDragging } = useSortable({
    id,
    index,
    disabled: !reordering || disabled,
  })

  async function handleDelete() {
    setDeleting(true)
    setDeleteError(null)
    try {
      await onDelete()
      setDeleteOpen(false)
    } catch (error) {
      setDeleteError(
        error instanceof Error
          ? error.message
          : `Unable to delete ${contentType}. Please try again.`,
      )
    } finally {
      setDeleting(false)
    }
  }

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
          to={editTo}
          className="text-light-blue font-bold hover:saturate-120 hover:scale-102"
        >
          Edit
        </Link>
        <span className="text-gray-300 font-bold">|</span>
        <div ref={deleteAnchorRef} className="inline-block">
          <DeleteConfirmation
            deleteType={contentType}
            open={deleteOpen}
            onOpenChange={(open) => {
              setDeleteOpen(open)
              if (open) setDeleteError(null)
            }}
            onConfirm={handleDelete}
            confirming={deleting}
            error={deleteError}
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
