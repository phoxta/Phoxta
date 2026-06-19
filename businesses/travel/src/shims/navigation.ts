// next/navigation shim → react-router equivalents.
import { useLocation, useNavigate, useParams as rrUseParams, useSearchParams as rrUseSearchParams } from "react-router-dom";

export function usePathname(): string {
    return useLocation().pathname;
}

export function useRouter() {
    const navigate = useNavigate();
    return {
        push: (href: string) => navigate(href),
        replace: (href: string) => navigate(href, { replace: true }),
        back: () => navigate(-1),
        forward: () => navigate(1),
        refresh: () => {},
        prefetch: () => {},
    };
}

export function useSearchParams(): URLSearchParams {
    const [sp] = rrUseSearchParams();
    return sp;
}

export function useParams<T = Record<string, string>>(): T {
    return rrUseParams() as T;
}

export function redirect(href: string): never {
    window.location.assign(href);
    throw new Error("redirect");
}
export const permanentRedirect = redirect;

export function notFound(): never {
    throw new Error("NEXT_NOT_FOUND");
}

export function useSelectedLayoutSegment(): string | null {
    return null;
}
export function useSelectedLayoutSegments(): string[] {
    return [];
}
