"use client"

import * as React from "react"

import type { ErrorFallbackLabels } from "./ErrorFallback"

import { ErrorFallback } from "./ErrorFallback"

/**
 * Props for the ErrorBoundary component
 */
export interface ErrorBoundaryProps {
  /** Child components to wrap */
  children: React.ReactNode
  /** Custom fallback UI (overrides default ErrorFallback) */
  fallback?: React.ReactNode
  /** Callback fired when an error is caught */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  /** Callback fired when reset is triggered */
  onReset?: () => void
  /** Localized labels for the default fallback */
  labels?: Partial<ErrorFallbackLabels>
  /** Show error message in fallback */
  showErrorMessage?: boolean
}

/**
 * Internal state for ErrorBoundary
 */
interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * ErrorBoundary - React Error Boundary for graceful error handling
 *
 * Catches JavaScript errors in child component tree and displays
 * a fallback UI instead of crashing the entire app.
 *
 * Features:
 * - Catches render errors in children
 * - Customizable fallback UI
 * - onError callback for logging/reporting
 * - Reset capability to recover from errors
 * - Default ErrorFallback with friendly UI
 *
 * @example
 * ```tsx
 * // Basic usage with default fallback
 * <ErrorBoundary>
 *   <MyComponent />
 * </ErrorBoundary>
 *
 * // With error logging
 * <ErrorBoundary
 *   onError={(error, info) => {
 *     Sentry.captureException(error)
 *     console.error('Component error:', error, info)
 *   }}
 * >
 *   <MyComponent />
 * </ErrorBoundary>
 *
 * // With custom fallback
 * <ErrorBoundary
 *   fallback={<div>Something went wrong</div>}
 * >
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  /**
   * Update state when an error is thrown
   */
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  /**
   * Log error and call onError callback
   */
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("ErrorBoundary caught an error:", error, errorInfo)
    }

    // Call the onError callback if provided
    this.props.onError?.(error, errorInfo)
  }

  /**
   * Reset the error boundary state
   */
  handleReset = (): void => {
    this.setState({ hasError: false, error: null })
    this.props.onReset?.()
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Use default ErrorFallback
      return (
        <ErrorFallback
          error={this.state.error}
          onReset={this.handleReset}
          labels={this.props.labels}
          showErrorMessage={this.props.showErrorMessage}
        />
      )
    }

    return this.props.children
  }
}
