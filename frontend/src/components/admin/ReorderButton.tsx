/** Button to trigger module, lesson, and quiz reordering. */

import { ArrowDownUp } from 'lucide-react'
import { Button } from '../ui/button'

type ReorderButtonProps = {
  reordering: boolean
  disabled?: boolean
  // What the button says while reordering; where the order is saved on the
  // spot this is "Save", but quiz questions are saved with the whole quiz.
  doneLabel?: string
  onClick: () => void
}

export default function ReorderButton({
  reordering,
  disabled = false,
  doneLabel = 'Save',
  onClick,
}: ReorderButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      disabled={disabled}
      onClick={onClick}
      className="rounded-md cursor-pointer border-light-blue border-3 text-light-blue font-bold drop-shadow-sm drop-shadow-muted-navy/25 transition ease-in-out hover:text-light-blue hover:bg-lightest-blue hover:scale-102"
    >
      {reordering ? doneLabel : 'Reorder'}
      {!reordering && <ArrowDownUp className="stroke-light-blue" />}
    </Button>
  )
}
