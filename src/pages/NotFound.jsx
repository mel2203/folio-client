import { Link } from 'react-router-dom'
import { Button } from '../components/ui/button.jsx'
import Logo from '../components/Logo.jsx'

function NotFound() {
  return (
    <main className="not-found">
      <Logo />
      <section className="not-found__card">
        <p className="not-found__code">404 · PAGE NOT FOUND</p>
        <h1>This page isn&apos;t in the books.</h1>
        <p>The page you&apos;re looking for doesn&apos;t exist or may have moved.</p>
        <Button asChild><Link to="/dashboard">Go to dashboard</Link></Button>
      </section>
    </main>
  )
}

export default NotFound
