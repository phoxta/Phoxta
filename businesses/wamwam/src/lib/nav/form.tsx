import type { FormHTMLAttributes, ReactNode } from "react";
import { useNavigate } from "react-router-dom";

/**
 * A <form> whose `action` is either a path to navigate to (the form's fields
 * become the query string, GET-style) or a function that receives the
 * submitted FormData.
 *
 * `action` is handled here and never reaches the DOM, so the emitted element
 * carries no action attribute in either mode. The function path is what makes
 * every search, booking, checkout and contact form on the site actually
 * submit — the predecessor stripped functions and did nothing.
 */

export type FormAction = string | ((data: FormData) => void | Promise<void>);

export interface QueryFormProps extends Omit<FormHTMLAttributes<HTMLFormElement>, "action"> {
    action?: FormAction;
    children?: ReactNode;
}

export function formDataToQuery(fd: FormData): string {
    const params = new URLSearchParams();
    fd.forEach((v, k) => params.append(k, String(v)));
    return params.toString();
}

export default function QueryForm({ action, children, onSubmit, ...rest }: QueryFormProps) {
    const navigate = useNavigate();

    // Typed from the prop so it tracks React's own event type for <form onSubmit>.
    const handleSubmit: NonNullable<QueryFormProps["onSubmit"]> = (e) => {
        e.preventDefault();
        onSubmit?.(e);
        if (typeof action === "string") {
            const qs = formDataToQuery(new FormData(e.currentTarget));
            navigate(action + (qs ? `?${qs}` : ""));
        } else if (typeof action === "function") {
            void action(new FormData(e.currentTarget));
        }
    };

    return (
        <form {...rest} onSubmit={handleSubmit}>
            {children}
        </form>
    );
}
