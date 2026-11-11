import { cn } from '../lib/utils.js'

function Panel({ title, children, className, ...props }) {
  return (
    <section
      className={cn('rounded-2xl border border-border bg-card p-5 shadow-soft', className)}
      {...props}
    >
      {title && <h2 className="mb-4 text-lg">{title}</h2>}
      {children}
    </section>
  )
}

export default Panel
