import './Sales.css'

const LABELS = {
  draft: 'Draft',
  sent: 'Sent',
  partial: 'Partial',
  paid: 'Paid',
  void: 'Void',
}

function SalesStatus({ status }) {
  return (
    <span className={`sales-status sales-status--${status}`}>
      {LABELS[status] || status}
    </span>
  )
}

export default SalesStatus
