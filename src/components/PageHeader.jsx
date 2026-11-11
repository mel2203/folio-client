import { cn } from '../lib/utils.js'

function PageHeader({ title, sub, children, className }) {
  return (
    <div className={cn('mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5', className)}>
      <div>
        <h1 className="text-4xl text-foreground">{title}</h1>
        {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
      </div>
      {children && <div className="flex flex-wrap items-end gap-2">{children}</div>}
    </div>
  )
}

export default PageHeader
