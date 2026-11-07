export type QuestionInputProps<Q> = {
  question: Q
  number: number
  value: string
  invalid: boolean
  onChange: (value: string) => void
}
