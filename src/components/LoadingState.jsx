import { cn } from '../lib/utils.js'

function LoadingState({ label, className }) {
  return (
    <div className={cn('folio-loading-state', className)} role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      <div className="folio-loading-state__skeleton" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </div>
  )
}

export default LoadingState
