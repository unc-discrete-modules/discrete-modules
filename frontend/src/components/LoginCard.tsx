import { Button } from './ui/button'
import { Card, CardContent, CardHeader } from './ui/card'

export default function LoginCard() {
  return (
    <Card className="w-full items-center">
      <CardHeader className="w-full text-center">
        <h1 className="whitespace-nowrap text-lg">Welcome to Discrete Modules</h1>
      </CardHeader>
      <CardContent>
        <Button>Login with UNC SSO</Button>
      </CardContent>
    </Card>
  )
}
