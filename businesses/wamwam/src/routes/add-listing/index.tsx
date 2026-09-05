import { Navigate } from "react-router-dom";

/**
 * /add-listing has no screen of its own — step 1 is the entry point.
 * A client-side <Navigate> replaces the old server redirect(), which in this
 * SPA would be a full document load.
 */
export default function AddListingIndex() {
    return <Navigate to="/add-listing/1" replace />;
}
