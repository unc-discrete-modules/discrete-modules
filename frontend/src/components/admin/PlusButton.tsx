import { Plus } from 'lucide-react'
import { Button } from '../ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip'

/** Plus button used for lesson and quiz creation. */
export default function PlusButton() {
  return (
    <>
      <Tooltip>
        <TooltipTrigger>
          <Button
            variant="outline"
            className={`rounded-full cursor-pointer border-light-blue border-3 text-light-blue font-bold drop-shadow-sm drop-shadow-muted-navy/25 transition ease-in-out hover:text-light-blue hover:saturate-120 hover:scale-102`}
          >
            <Plus />
          </Button>
        </TooltipTrigger>
        <TooltipContent className="bg-muted-navy font-semibold *:last:invisible">
          Create
        </TooltipContent>
      </Tooltip>
    </>
  )
}
