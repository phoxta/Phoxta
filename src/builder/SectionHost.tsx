import { Component, Suspense, type ReactNode } from "react";

/**
 * Wraps every section rendered in the builder/renderer with:
 *  - Suspense, because sections are lazy-loaded (each is its own chunk), and
 *  - an error boundary, because ~228 auto-registered sections include some that
 *    expect special props or a parent wrapper; one of those must degrade to a
 *    placeholder instead of taking down the whole editor or page.
 */
class SectionErrorBoundary extends Component<{ name: string; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="container py-5">
          <div className="bg-neutral-100 neutral-500 rounded-4 p-4 text-center fz-font-md">
            “{this.props.name}” couldn’t render here. It may need content edited in the panel, or it depends on a parent context.
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function SectionHost({ name, children }: { name: string; children: ReactNode }) {
  return (
    <SectionErrorBoundary name={name}>
      <Suspense
        fallback={
          <div className="container py-5 text-center neutral-500 fz-font-md">Loading section…</div>
        }
      >
        {children}
      </Suspense>
    </SectionErrorBoundary>
  );
}
