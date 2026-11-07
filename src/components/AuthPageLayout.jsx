import Logo from './Logo.jsx'
import './AuthPageLayout.css'

function AuthPageLayout({ children }) {
  return (
    <main className="auth-page">
      <section className="auth-page__brand" aria-label="Folio">
        <div className="auth-page__decoration" aria-hidden="true">
          <span className="auth-page__shape auth-page__shape--circle" />
          <span className="auth-page__shape auth-page__shape--semicircle" />
        </div>
        <div className="auth-page__brand-content">
          <Logo variant="dark" />
          <p>Clear books. Confident business.</p>
        </div>
      </section>
      <section className="auth-page__form-area">
        <div className="auth-form">{children}</div>
      </section>
    </main>
  )
}

export default AuthPageLayout
