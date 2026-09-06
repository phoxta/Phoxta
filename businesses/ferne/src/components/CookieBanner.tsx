import { useEffect, useState } from "react";

const KEY = "ferne:cookie";

/** Cookie notice. The store sets no advertising trackers, so the choice is
 *  genuinely between "remember my bag" and "remember nothing" — and it is only
 *  asked once. */
export default function CookieBanner() {
    const [choice, setChoice] = useState<string | null>(() => {
        try {
            return localStorage.getItem(KEY);
        } catch {
            // Storage is blocked, so nothing is being stored to consent to.
            return "essential";
        }
    });
    const [show, setShow] = useState(false);

    useEffect(() => {
        if (choice) return;
        const t = window.setTimeout(() => setShow(true), 800);
        return () => window.clearTimeout(t);
    }, [choice]);

    if (choice) return null;

    const decide = (value: string) => {
        try {
            localStorage.setItem(KEY, value);
        } catch {
            /* the banner still goes away for this session */
        }
        setShow(false);
        setChoice(value);
    };

    return (
        <div className={`cookie${show ? " show" : ""}`} role="region" aria-label="Cookie notice">
            <b>We use cookies</b> to remember your bag and preferences, and to understand which pages help. No
            advertising trackers.
            <div className="row">
                <button type="button" className="btn sm plain" onClick={() => decide("all")}>
                    Accept
                </button>
                <button type="button" className="btn sm plain ghost" onClick={() => decide("essential")}>
                    Essential only
                </button>
            </div>
        </div>
    );
}
