import { Plus } from 'lucide-react'
import { Button } from '../ui/button'

/** Plus button used for lesson and quiz creation. */
export default function PlusButton() {
  return (
    <>
      <Button
        variant="outline"
        className={`rounded-md border-light-blue border-3 text-light-blue font-bold drop-shadow-sm drop-shadow-muted-navy/25 transition ease-in-out hover:text-light-blue hover:saturate-120 hover:scale-102`}
      >
        <Plus />
      </Button>
    </>
  )
}
