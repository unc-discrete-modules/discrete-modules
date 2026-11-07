/** Button for module, lesson, quiz deletion. Use with DeleteConfirmation. */

import { Trash } from 'lucide-react'
import { Button } from '../ui/button'
import { useState, type RefObject } from 'react'
import DeleteConfirmation from './DeleteConfirmation'

type DeleteButtonProps = {
  anchor: RefObject<HTMLDivElement | null>
}

export default function DeleteButton({ anchor }: DeleteButtonProps) {
  const [open, setOpen] = useState(false)
  return (
    <DeleteConfirmation
      deleteType="module"
      open={open}
      onOpenChange={setOpen}
      anchor={anchor}
      trigger={
        <Button className="w-full rounded-md bg-delete-red font-bold drop-shadow-sm drop-shadow-muted-navy/25 transition ease-in-out hover:bg-delete-red hover:saturate-120 hover:scale-102">
          Delete
          <Trash />
        </Button>
      }
    />
  )
}
