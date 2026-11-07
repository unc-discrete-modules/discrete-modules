/** Button to trigger module, lesson, and quiz reordering. */

import { ArrowDownUp } from 'lucide-react'
import { Button } from '../ui/button'

export default function ReorderButton() {
  return (
    <>
      <Button
        variant="outline"
        className="rounded-md border-light-blue border-3 text-light-blue font-bold drop-shadow-sm drop-shadow-muted-navy/25 transition ease-in-out hover:text-light-blue hover:bg-lightest-blue hover:scale-102"
      >
        Reorder
        <ArrowDownUp className="stroke-light-blue" />
      </Button>
    </>
  )
}
