import { useId } from 'react'
import { cn } from '../lib/utils.js'

function EmptyState({ title, description, children, className }) {
  const titleId = useId()

  return (
    <section className={cn('folio-empty-state', className)} role="status" aria-labelledby={titleId}>
      <h2 id={titleId}>{title}</h2>
      {description && <p>{description}</p>}
      {children && <div className="folio-empty-state__actions">{children}</div>}
    </section>
  )
}

export default EmptyState
