/** Popup that appears to confirm deletion of a module, quiz, or lesson. */
import type { ReactElement, RefObject } from 'react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverHeader,
  PopoverTitle,
  PopoverDescription,
} from '@/components/ui/popover'
import { Button } from '../ui/button'

type DeleteProps = {
  deleteType: string
  open: boolean
  onOpenChange: (open: boolean) => void
  trigger: ReactElement
  anchor: RefObject<HTMLDivElement | null>
}

export default function DeleteConfirmation({
  deleteType,
  open,
  onOpenChange,
  trigger,
  anchor,
}: DeleteProps) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger render={trigger} />
      <PopoverContent anchor={anchor} className="w-80">
        <div className="flex flex-col items-center gap-4">
          <PopoverHeader className="gap-2 text-center">
            <PopoverTitle className="text-muted-navy font-semibold">
              Are you sure you want to delete this {deleteType}?
            </PopoverTitle>
            <PopoverDescription>
              This action cannot be undone.
            </PopoverDescription>
          </PopoverHeader>
          <div className="grid w-full grid-cols-2 gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="rounded-sm text-muted-navy"
            >
              Cancel
            </Button>
            <Button variant="destructive" size="sm" className="rounded-sm">
              Delete
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
