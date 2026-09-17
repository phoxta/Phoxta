import { Outlet } from "react-router-dom";
import { VentureProvider } from "@/lib/founder/store";

/**
 * Wraps every /founder route in the venture record, so a founder's answers
 * follow them from tool to tool without an account. State lives in
 * localStorage; nothing is sent anywhere unless they ask the adviser.
 */
export default function FounderLayout() {
    return (
        <VentureProvider>
            <Outlet />
        </VentureProvider>
    );
}
