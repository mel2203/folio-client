import { useEffect } from 'react'
import './Toast.css'

function Toast({ message, tone = 'positive', onDismiss }) {
  useEffect(() => {
    if (!message) return undefined
    const timeout = window.setTimeout(onDismiss, 4500)
    return () => window.clearTimeout(timeout)
  }, [message, onDismiss])

  if (!message) return null

  return (
    <div
      className={`app-toast app-toast--${tone}`}
      role={tone === 'error' ? 'alert' : 'status'}
      aria-live={tone === 'error' ? 'assertive' : 'polite'}
    >
      <span>{message}</span>
      <button type="button" onClick={onDismiss} aria-label="Dismiss notification">
        Dismiss
      </button>
    </div>
  )
}

export default Toast
