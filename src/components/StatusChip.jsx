import './StatusChip.css'

function StatusChip({ children, tone = 'neutral' }) {
  return <span className={`status-chip status-chip--${tone}`}>{children}</span>
}

export default StatusChip
