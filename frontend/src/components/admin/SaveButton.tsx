/** Save button component, consists of filled and outline variants. */
import { Button } from '../ui/button'

type SaveOutlineButtonProps = {
  color: string
  onClick?: () => void
}

type SaveFillButtonProps = {
  onClick?: () => void
}

export function SaveOutlineButton({ color, onClick }: SaveOutlineButtonProps) {
  return (
    <>
      <Button
        onClick={onClick}
        variant="outline"
        className={`rounded-md border-${color} cursor-pointer border-3 text-${color} font-bold drop-shadow-sm drop-shadow-muted-navy/25 transition ease-in-out hover:text-${color} hover:saturate-120 hover:scale-102`}
      >
        Save
      </Button>
    </>
  )
}

export function SaveFillButton({ onClick }: SaveFillButtonProps) {
  return (
    <>
      <Button
        onClick={onClick}
        className="w-full rounded-md bg-light-blue cursor-pointer font-bold drop-shadow-sm drop-shadow-muted-navy/25 transition ease-in-out hover:saturate-130 hover:scale-102"
      >
        Save
      </Button>
    </>
  )
}
