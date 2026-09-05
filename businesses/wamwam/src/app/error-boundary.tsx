import { isRouteErrorResponse, Link, useRouteError } from "react-router-dom";
import { ENV } from "@/config/env";
import { isNotFoundError } from "@/lib/nav/navigation";
import NotFound from "@/routes/pages/not-found";

/**
 * Route-level error UI. A 404 — from an unmatched URL or a page calling
 * notFound() — renders the designed not-found screen; anything else renders
 * the recovery screen with the error text in development.
 */
export default function ErrorBoundary() {
    const error = useRouteError();

    if ((isRouteErrorResponse(error) && error.status === 404) || isNotFoundError(error)) {
        return <NotFound />;
    }

    const message =
        error instanceof Error ? error.message : typeof error === "string" ? error : "Something went wrong.";

    return (
        <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
            <p className="text-sm font-semibold tracking-wide text-primary/80 uppercase">Experiences</p>
            <h1 className="mt-3 text-3xl font-semibold text-neutral-900 dark:text-neutral-100">This page hit a snag</h1>
            <p className="mt-3 max-w-md text-neutral-500 dark:text-neutral-400">
                Sorry — something didn’t load as expected. You can head back home and try again.
            </p>
            {ENV.isDev && (
                <pre className="mt-6 max-w-xl overflow-auto rounded-xl bg-neutral-100 p-4 text-left text-xs text-red-600 dark:bg-neutral-800">
                    {message}
                </pre>
            )}
            <div className="mt-8 flex gap-3">
                <Link
                    to="/"
                    className="rounded-full bg-neutral-900 px-6 py-3 text-sm font-medium text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900"
                >
                    Back to home
                </Link>
                <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="rounded-full border border-neutral-300 px-6 py-3 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-600 dark:text-neutral-200"
                >
                    Try again
                </button>
            </div>
        </div>
    );
}
