import { ChevronRight } from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

export default function FAQ() {
  return (
    <div className="mx-10">
      <div className="flex items-start justify-between py-5">
        <h1 className="text-3xl font-bold text-muted-navy">
          Frequently Asked Questions
        </h1>
      </div>
      <h4 className="pb-5 text-gray-500">
        For additional support, contact Alyssa Lytle at abyrnes1@cs.unc.edu.
      </h4>
      <div>
        <Collapsible className="group/collapsible border-y border-slate-200">
          <CollapsibleTrigger className="flex w-full items-center gap-2 py-3 text-left text-lg font-medium text-slate-700">
            <ChevronRight
              aria-hidden
              className="size-5 shrink-0 transition-transform duration-150 group-data-open/collapsible:rotate-90"
            />
            Question 1
          </CollapsibleTrigger>
          <CollapsibleContent className="pb-4 pl-7 text-base text-slate-700">
            Answer content goes here.
          </CollapsibleContent>
        </Collapsible>
        <Collapsible className="group/collapsible border-y border-slate-200">
          <CollapsibleTrigger className="flex w-full items-center gap-2 py-3 text-left text-lg font-medium text-slate-700">
            <ChevronRight
              aria-hidden
              className="size-5 shrink-0 transition-transform duration-150 group-data-open/collapsible:rotate-90"
            />
            Question 2
          </CollapsibleTrigger>
          <CollapsibleContent className="pb-4 pl-7 text-base text-slate-700">
            Answer content goes here.
          </CollapsibleContent>
        </Collapsible>
        <Collapsible className="group/collapsible border-y border-slate-200">
          <CollapsibleTrigger className="flex w-full items-center gap-2 py-3 text-left text-lg font-medium text-slate-700">
            <ChevronRight
              aria-hidden
              className="size-5 shrink-0 transition-transform duration-150 group-data-open/collapsible:rotate-90"
            />
            Question 3
          </CollapsibleTrigger>
          <CollapsibleContent className="pb-4 pl-7 text-base text-slate-700">
            Answer content goes here.
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  )
}
