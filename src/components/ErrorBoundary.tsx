import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: (reset: () => void) => ReactNode;
}

/** Catches render errors so a failing widget never produces a blank page. */
export class ErrorBoundary extends Component<Props, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Details stay in the console for staff; guests see a friendly message.
    console.error('[ui] render error', error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return this.props.fallback ? (
        this.props.fallback(this.reset)
      ) : (
        <FullPageMessage code="Error" title="Something went wrong" description="Please reload the page. If the problem continues, contact the hotel reception." action={{ label: 'Reload', onClick: () => window.location.reload() }} />
      );
    }
    return this.props.children;
  }
}

export function FullPageMessage({
  code,
  title,
  description,
  action,
}: {
  code: string;
  title: string;
  description?: string;
  action?: { label: string; href?: string; onClick?: () => void };
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#f7f4ee] px-6 text-[#1b211e]">
      <div className="max-w-md text-center">
        <p className="display text-6xl text-[#a68633]">{code}</p>
        <h1 className="mt-4 text-2xl font-semibold">{title}</h1>
        {description && <p className="mt-2 text-[0.95rem] text-neutral-600">{description}</p>}
        {action &&
          (action.href ? (
            <a href={action.href} className="mt-8 inline-flex h-11 items-center rounded-full bg-[#1b211e] px-6 font-semibold text-white">
              {action.label}
            </a>
          ) : (
            <button type="button" onClick={action.onClick} className="mt-8 inline-flex h-11 items-center rounded-full bg-[#1b211e] px-6 font-semibold text-white">
              {action.label}
            </button>
          ))}
      </div>
    </main>
  );
}
