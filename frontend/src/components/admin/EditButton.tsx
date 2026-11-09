/** Button that navigates to module editing. */

import { SquarePen } from 'lucide-react'
import { Button } from '../ui/button'

export default function EditButton() {
  return (
    <>
      <Button className="w-full truncate rounded-md bg-light-blue font-bold drop-shadow-sm drop-shadow-muted-navy/25 transition ease-in-out hover:saturate-130 hover:scale-102">
        Edit
        <SquarePen />
      </Button>
    </>
  )
}
