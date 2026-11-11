import { cn } from '../lib/utils.js'

function Stat({ label, value, tone, className }) {
  return (
    <div className={cn('rounded-2xl border border-border bg-card p-5 shadow-soft', className)}>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div
        className={cn(
          'num mt-2 text-left text-2xl',
          tone === 'good' && 'text-success-text',
          tone === 'bad' && 'text-destructive-text',
        )}
      >
        {value}
      </div>
    </div>
  )
}

export default Stat
