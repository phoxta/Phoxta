import { Navigate } from "react-router-dom";
import { useSpace } from "@/state/space";

/**
 * /family has no page of its own: a parent lands on the members, a guest on
 * the list of what they were given — which is the whole of their product —
 * and a child on the only thing here that is theirs, their own profile.
 */
export default function IndexPage() {
    const { can, role } = useSpace();
    return <Navigate to={can("family.manage") ? "/family/members" : role === "guest" ? "/family/shared" : "/family/settings"} replace />;
}
