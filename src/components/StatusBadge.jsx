import { cn } from '../lib/utils.js'

const STATUS_STYLES = {
  draft: 'bg-muted text-muted-foreground',
  sent: 'bg-ring/15 text-ring',
  partial: 'bg-primary/30 text-foreground',
  paid: 'bg-accent/15 text-success-text',
  void: 'bg-destructive/10 text-destructive-text line-through',
  posted: 'bg-accent/40 text-foreground',
}

function StatusBadge({ status, className }) {
  const label = String(status)
  const statusKey = label.toLowerCase()

  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide',
        STATUS_STYLES[statusKey] ?? STATUS_STYLES.draft,
        className,
      )}
    >
      {label}
    </span>
  )
}

export default StatusBadge
