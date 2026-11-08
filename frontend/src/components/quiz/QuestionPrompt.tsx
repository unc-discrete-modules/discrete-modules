import { cn } from 'cn'
import { FieldLegend } from '@/components/ui/field'
import MathText from './MathText'

type QuestionPromptProps = {
  number: number
  prompt: string
  invalid: boolean
}

export default function QuestionPrompt({
  number,
  prompt,
  invalid,
}: QuestionPromptProps) {
  return (
    <FieldLegend
      className={cn(
        'data-[variant=legend]:text-lg',
        invalid && 'text-destructive',
      )}
    >
      <span className="block text-sm text-slate-500">Question {number}</span>
      <MathText>{prompt}</MathText>
    </FieldLegend>
  )
}
