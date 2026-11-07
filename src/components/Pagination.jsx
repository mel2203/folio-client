import './Pagination.css'

function Pagination({ page, limit, total, onPageChange }) {
  const start = total === 0 ? 0 : (page - 1) * limit + 1
  const end = Math.min(page * limit, total)
  const hasPrevious = page > 1
  const hasNext = end < total

  return (
    <nav className="pagination" aria-label="Journal entries pagination">
      <p className="pagination__range">
        Showing {start}-{end} of {total}
      </p>
      <div className="pagination__controls">
        <button
          type="button"
          className="pagination__button"
          disabled={!hasPrevious}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </button>
        <span className="pagination__page">Page {page}</span>
        <button
          type="button"
          className="pagination__button"
          disabled={!hasNext}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
    </nav>
  )
}

export default Pagination
