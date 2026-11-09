/** Button to trigger module, lesson, and quiz reordering. */

import { ArrowDownUp } from 'lucide-react'
import { Button } from '../ui/button'

type ReorderButtonProps = {
  reordering: boolean
  disabled?: boolean
  onClick: () => void
}

export default function ReorderButton({
  reordering,
  disabled = false,
  onClick,
}: ReorderButtonProps) {
  return (
    <Button
      variant="outline"
      disabled={disabled}
      onClick={onClick}
      className="rounded-md border-light-blue border-3 text-light-blue font-bold drop-shadow-sm drop-shadow-muted-navy/25 transition ease-in-out hover:text-light-blue hover:bg-lightest-blue hover:scale-102"
    >
      {reordering ? 'Save' : 'Reorder'}
      {!reordering && <ArrowDownUp className="stroke-light-blue" />}
    </Button>
  )
}
