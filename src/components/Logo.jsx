function Logo({ variant = 'light' }) {
  return (
    <span className={`logo logo--${variant}`} aria-label="Folio">
      <span className="logo__word">Folio</span>
      <span className="logo__rule logo__rule--primary" aria-hidden="true" />
      <span className="logo__rule logo__rule--accent" aria-hidden="true" />
    </span>
  )
}

export default Logo
