import ReactMarkdown from 'react-markdown'
import { rehypePlugins, remarkPlugins } from '@/components/lesson/markdown'

type MathTextProps = {
  children: string
}

export default function MathText({ children }: MathTextProps) {
  return (
    <span className="math-text">
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={{ p: ({ children }) => <span>{children}</span> }}
      >
        {children}
      </ReactMarkdown>
    </span>
  )
}
