/**
 * Emits a robots noindex directive. Drop into private/app shells (dashboard,
 * auth, onboarding) so those routes are never indexed. React 19 hoists the
 * <meta> into <head>.
 */
export default function NoIndex() {
    return <meta name="robots" content="noindex, nofollow" />;
}
