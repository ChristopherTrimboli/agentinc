"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  /** Custom fallback UI. Receives the error and a reset function. */
  fallback?: ReactNode | ((props: { error: Error; reset: () => void }) => ReactNode);
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Change this key to force-reset the boundary from a parent (e.g. on route change). */
  resetKey?: string | number;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary that catches render-time JS errors in child components.
 * Wrap risky subtrees (canvas, charts, third-party widgets, heavy pages).
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidUpdate(prevProps: Props) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.reset();
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] caught:", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const { fallback } = this.props;

      if (typeof fallback === "function") {
        return fallback({ error: this.state.error!, reset: this.reset });
      }
      if (fallback) {
        return fallback;
      }

      return (
        <div className="flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-center backdrop-blur-sm">
          <AlertTriangle className="mb-3 h-8 w-8 text-red-400" />
          <h3 className="mb-1 text-base font-semibold text-white">
            Something went wrong
          </h3>
          <p className="mb-4 max-w-sm text-sm text-white/50">
            {this.state.error?.message || "An unexpected error occurred"}
          </p>
          <button
            onClick={this.reset}
            className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * HOC wrapper for class-based ErrorBoundary.
 *
 * ```tsx
 * const SafeChart = withErrorBoundary(AgentArenaChart);
 * ```
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: Props["fallback"],
) {
  function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  }
  WithErrorBoundary.displayName = `withErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name || "Component"})`;
  return WithErrorBoundary;
}
