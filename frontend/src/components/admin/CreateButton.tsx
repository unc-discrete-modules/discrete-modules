/** Button that navigates to module creation. */

import { Plus } from 'lucide-react'
import { Button } from '../ui/button'

export default function CreateButton() {
  return (
    <>
      <Button
        variant="outline"
        className="rounded-md border-light-green border-3 text-light-green font-bold drop-shadow-sm drop-shadow-muted-navy/25 transition ease-in-out hover:text-light-green hover:bg-lightest-green hover:scale-102"
      >
        Create
        <Plus className="stroke-light-green" />
      </Button>
    </>
  )
}
