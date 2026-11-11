import { Component } from 'react'
import Logo from './Logo.jsx'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="app-error-boundary">
          <Logo />
          <section className="app-error-boundary__card" role="alert">
            <p className="app-error-boundary__label">FOLIO · UNEXPECTED ERROR</p>
            <h1>Something went wrong</h1>
            <p>This page could not be displayed. Reload it to try again.</p>
            <button type="button" onClick={() => window.location.reload()}>
              Reload page
            </button>
          </section>
        </main>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
