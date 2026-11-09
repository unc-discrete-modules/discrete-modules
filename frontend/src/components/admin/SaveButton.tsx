/** Save button component, consists of filled and outline variants. */
import { Button } from '../ui/button'

type saveProp = {
  color: string
}

export function SaveOutlineButton({ color }: saveProp) {
  return (
    <>
      <Button
        variant="outline"
        className={`rounded-md border-${color} border-3 text-${color} font-bold drop-shadow-sm drop-shadow-muted-navy/25 transition ease-in-out hover:text-${color} hover:saturate-120 hover:scale-102`}
      >
        Save
      </Button>
    </>
  )
}

export function SaveFillButton() {
  return (
    <>
      <Button className="w-full rounded-md bg-light-blue font-bold drop-shadow-sm drop-shadow-muted-navy/25 transition ease-in-out hover:saturate-130 hover:scale-102">
        Save
      </Button>
    </>
  )
}
