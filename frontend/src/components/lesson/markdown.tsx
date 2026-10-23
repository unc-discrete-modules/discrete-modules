import type { Components } from 'react-markdown'
import rehypeMathjax from 'rehype-mathjax'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'

export const remarkPlugins = [remarkGfm, remarkMath]
export const rehypePlugins = [rehypeMathjax]

// Wide tables, such as truth tables, scroll instead of overflowing the page.
export const tableComponents: Components = {
  table: ({ children }) => (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-slate-300 bg-slate-100 px-3 py-2 font-semibold text-slate-900">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-slate-300 px-3 py-2">{children}</td>
  ),
}
