/** Cancel button */

import { Button } from '../ui/button'

export default function CancelButton() {
  return (
    <>
      <Button
        variant="secondary"
        className="rounded-md bg-gray border-3 text-muted-navy font-bold drop-shadow-sm drop-shadow-muted-navy/25 transition ease-in-out hover:text-muted-navy hover:scale-102"
      >
        Cancel
      </Button>
    </>
  )
}
