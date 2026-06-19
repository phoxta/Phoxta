import { useNavigate } from "react-router-dom";
import type { FormHTMLAttributes, ReactNode } from "react";

// next/form shim → a real <form> that navigates to `action` with the form's
// fields serialised as the query string (matching next/form GET behaviour).
type Props = Omit<FormHTMLAttributes<HTMLFormElement>, "action"> & { action?: string; children?: ReactNode };

export default function Form({ action, children, onSubmit, ...rest }: Props) {
    const navigate = useNavigate();
    return (
        <form
            {...rest}
            onSubmit={(e) => {
                e.preventDefault();
                onSubmit?.(e);
                if (typeof action === "string") {
                    const fd = new FormData(e.currentTarget);
                    const params = new URLSearchParams();
                    fd.forEach((v, k) => params.append(k, String(v)));
                    const qs = params.toString();
                    navigate(action + (qs ? `?${qs}` : ""));
                }
            }}
        >
            {children}
        </form>
    );
}
