import { Navigate } from 'react-router-dom'
import { getAuthors } from '@/data/authors'

/**
 * /authors has no index screen — it forwards to the first author's profile.
 * A <Navigate> element (rather than the old redirect(), which threw during
 * render and surfaced the error boundary) so the SPA history entry is replaced.
 */
export default function AuthorsPage() {
  return <Navigate to={`/authors/${getAuthors()[0].handle}`} replace />
}
