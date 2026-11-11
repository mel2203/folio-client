import { Link } from 'react-router-dom'

function NotFound() {
  return (
    <main className="not-found">
      <h1>Page not found</h1>
      <p>The page you&apos;re looking for doesn&apos;t exist.</p>
      <Link to="/dashboard">Go to dashboard</Link>
    </main>
  )
}

export default NotFound
