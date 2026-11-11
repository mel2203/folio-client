import './Sales.css'

export const DOCUMENT_STATUS_LABELS = {
  draft: 'Draft',
  sent: 'Sent',
  partial: 'Partial',
  paid: 'Paid',
  void: 'Void',
  open: 'Open',
}

export function DocumentStatus({ status, document = 'sales' }) {
  return (
    <span className={`sales-status sales-status--${status}${document === 'purchase' ? ' sales-status--purchase' : ''}`}>
      {DOCUMENT_STATUS_LABELS[status] || status}
    </span>
  )
}

function SalesStatus({ status }) {
  return <DocumentStatus status={status} />
}

export default SalesStatus
