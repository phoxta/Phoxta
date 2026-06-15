import Link from "@/components/common/Link"
import { useLocation } from "react-router-dom"

export default function Menu() {
	const location = useLocation()

	return (
		<>

			<ul className="sub-menu">
				<Link href="#" className={location.pathname == "/" ? "active" : ""}>Home Default</Link>
				<Link href="#" className={location.pathname == "/index-2" ? "active" : ""}>Home Interior</Link>
			</ul>
		</>
	)
}
