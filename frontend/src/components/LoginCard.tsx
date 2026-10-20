import type { ReactNode } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader } from './ui/card'

type LoginCardProps = {
  children?: ReactNode
}

export default function LoginCard({ children }: LoginCardProps) {
  return (
    <Card className="w-full items-center">
      <CardHeader className="w-full text-center">
        <h1 className="whitespace-nowrap text-lg">Welcome to Discrete Modules</h1>
      </CardHeader>
      <CardContent className="flex w-full flex-col gap-4">
        <p>Sign in with your UNC account to access lessons and quizzes.</p>
        {children ?? <Button>Login with UNC SSO</Button>}
      </CardContent>
    </Card>
  )
}
