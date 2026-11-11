import Logo from './Logo.jsx'
import './AuthPageLayout.css'

function AuthPageLayout({ children }) {
  return (
    <main className="auth-page">
      <section className="auth-page__brand" aria-label="About Folio">
        <div className="auth-page__decoration" aria-hidden="true">
          <span className="auth-page__shape auth-page__shape--circle" />
          <span className="auth-page__shape auth-page__shape--semicircle" />
        </div>
        <div className="auth-page__brand-top">
          <Logo variant="dark" />
        </div>
        <div className="auth-page__brand-content">
          <h2>Every entry, <em>in its place.</em></h2>
          <p>Invoices, bills and live reports on a true double-entry ledger, built for small businesses.</p>
        </div>
        <p className="auth-page__brand-foot">© 2026 Folio · Built by Lyana</p>
      </section>
      <section className="auth-page__form-area">
        <div className="auth-form">{children}</div>
      </section>
    </main>
  )
}

export default AuthPageLayout
