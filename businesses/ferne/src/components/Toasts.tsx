import { Link } from "react-router-dom";
import { useUi } from "@/state/ui";

/** Transient confirmations ("added to bag"). Announced politely so a screen
 *  reader hears the confirmation without losing the shopper's place. */
export default function Toasts() {
    const { toasts, dismiss } = useUi();
    if (!toasts.length) return null;
    return (
        <div className="toast-wrap" role="status" aria-live="polite">
            {toasts.map((t) => (
                <div className="toast" key={t.id}>
                    {t.message}
                    {t.action && (
                        <Link to={t.action.to} onClick={() => dismiss(t.id)}>
                            {t.action.label}
                        </Link>
                    )}
                </div>
            ))}
        </div>
    );
}
