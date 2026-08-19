import { Navigate } from "react-router-dom";

/**
 * Knowledge now lives on the Train page (ConfigurePage) — this stub keeps the
 * old /agent/knowledge deep links (and the App.tsx route + preloader that still
 * import it) working. Safe to delete once App.tsx and preload.ts drop it.
 */
export default function KnowledgePage() {
  return <Navigate to="../configure" replace />;
}
