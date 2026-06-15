import { useState } from "react"

import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import type { ErrorFallbackLabels } from "./ErrorFallback"

import { ErrorBoundary } from "./ErrorBoundary"
import { ErrorFallback } from "./ErrorFallback"

// Arabic labels for RTL stories
const arabicLabels: Partial<ErrorFallbackLabels> = {
  title: "حدث خطأ",
  description: "حدث خطأ ما. يرجى المحاولة مرة أخرى.",
  tryAgain: "إعادة المحاولة",
}

// Component that throws an error for demo purposes
function BuggyComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error("This is a simulated error for demonstration purposes")
  }
  return (
    <div className="bg-card rounded-lg p-6 text-center">
      <p className="text-foreground">Component rendered successfully!</p>
    </div>
  )
}

// ============================================================================
// ErrorFallback Stories (standalone usage)
// ============================================================================

const fallbackMeta: Meta<typeof ErrorFallback> = {
  title: "Common/ErrorFallback",
  component: ErrorFallback,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "ErrorFallback displays a friendly error message when something goes wrong. Can be used standalone or as the fallback UI for ErrorBoundary.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    error: {
      description: "The error that was caught",
    },
    onReset: {
      action: "reset",
      description: "Called when the retry button is clicked",
    },
    showErrorMessage: {
      control: "boolean",
      description: "Show the error message text",
    },
    showStackTrace: {
      control: "boolean",
      description: "Show the stack trace (dev mode)",
    },
  },
  decorators: [
    (Story) => (
      <div className="bg-background min-w-[320px] rounded-lg p-8">
        <Story />
      </div>
    ),
  ],
}

export default fallbackMeta
type FallbackStory = StoryObj<typeof fallbackMeta>

// Default ErrorFallback
export const Default: FallbackStory = {
  args: {
    error: new Error("Something went wrong"),
    onReset: () => {},
  },
  parameters: {
    docs: {
      description: {
        story:
          "Default error fallback with retry button. In production, only shows the friendly message.",
      },
    },
  },
}

// Without Reset Button
export const WithoutReset: FallbackStory = {
  args: {
    error: new Error("Something went wrong"),
  },
  parameters: {
    docs: {
      description: {
        story:
          "Error fallback without a retry button. Use when recovery is not possible.",
      },
    },
  },
}

// With Error Message Visible
export const WithErrorMessage: FallbackStory = {
  args: {
    error: new Error("NetworkError: Failed to fetch data from the API"),
    onReset: () => {},
    showErrorMessage: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Error fallback showing the actual error message. Useful for debugging or specific error types.",
      },
    },
  },
}

// With Stack Trace (Development)
export const WithStackTrace: FallbackStory = {
  args: {
    error: (() => {
      const err = new Error(
        "TypeError: Cannot read property 'map' of undefined"
      )
      err.stack = `Error: TypeError: Cannot read property 'map' of undefined
    at EventList (EventList.tsx:42:15)
    at renderWithHooks (react-dom.development.js:14985:18)
    at mountIndeterminateComponent (react-dom.development.js:17811:13)
    at beginWork (react-dom.development.js:19049:16)
    at HTMLUnknownElement.callCallback (react-dom.development.js:3945:14)
    at Object.invokeGuardedCallbackDev (react-dom.development.js:3994:16)
    at invokeGuardedCallback (react-dom.development.js:4056:31)
    at beginWork$1 (react-dom.development.js:23964:7)`
      return err
    })(),
    onReset: () => {},
    showErrorMessage: true,
    showStackTrace: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Error fallback with full stack trace visible. Only shown in development mode by default.",
      },
    },
  },
}

// RTL Mode with Arabic
export const RTLMode: FallbackStory = {
  args: {
    error: new Error("خطأ في الشبكة"),
    onReset: () => {},
    labels: arabicLabels,
  },
  decorators: [
    (Story) => (
      <div
        dir="rtl"
        className="font-arabic bg-background min-w-[320px] rounded-lg p-8"
      >
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: "ErrorFallback in RTL mode with Arabic text.",
      },
    },
  },
}

// ============================================================================
// ErrorBoundary Stories
// ============================================================================

export const ErrorBoundaryDefault: FallbackStory = {
  render: function ErrorBoundaryDemo() {
    const [hasError, setHasError] = useState(false)
    const [key, setKey] = useState(0)

    const handleError = (error: Error) => {
      console.log("ErrorBoundary caught:", error.message)
      setHasError(true)
    }

    const handleReset = () => {
      setHasError(false)
      setKey((k) => k + 1) // Force remount
    }

    return (
      <div className="space-y-4">
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setHasError(true)}
            className="bg-destructive text-destructive-foreground rounded-md px-3 py-1.5 text-sm"
          >
            Trigger Error
          </button>
          {hasError && (
            <button
              onClick={handleReset}
              className="bg-muted text-muted-foreground rounded-md px-3 py-1.5 text-sm"
            >
              Reset
            </button>
          )}
        </div>
        <ErrorBoundary key={key} onError={handleError} onReset={handleReset}>
          <BuggyComponent shouldThrow={hasError} />
        </ErrorBoundary>
      </div>
    )
  },
  parameters: {
    docs: {
      description: {
        story:
          "Interactive demo of ErrorBoundary. Click 'Trigger Error' to simulate an error and see the fallback UI.",
      },
    },
  },
}

export const ErrorBoundaryWithCustomFallback: FallbackStory = {
  render: function CustomFallbackDemo() {
    const [hasError, setHasError] = useState(false)
    const [key, setKey] = useState(0)

    const handleReset = () => {
      setHasError(false)
      setKey((k) => k + 1)
    }

    return (
      <div className="space-y-4">
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setHasError(true)}
            className="bg-destructive text-destructive-foreground rounded-md px-3 py-1.5 text-sm"
          >
            Trigger Error
          </button>
          {hasError && (
            <button
              onClick={handleReset}
              className="bg-muted text-muted-foreground rounded-md px-3 py-1.5 text-sm"
            >
              Reset
            </button>
          )}
        </div>
        <ErrorBoundary
          key={key}
          fallback={
            <div className="bg-destructive/10 border-destructive/20 rounded-lg border p-6 text-center">
              <p className="text-destructive font-medium">Custom fallback UI</p>
              <p className="text-muted-foreground mt-2 text-sm">
                This is a completely custom fallback component.
              </p>
            </div>
          }
        >
          <BuggyComponent shouldThrow={hasError} />
        </ErrorBoundary>
      </div>
    )
  },
  parameters: {
    docs: {
      description: {
        story:
          "ErrorBoundary with a completely custom fallback UI instead of the default ErrorFallback.",
      },
    },
  },
}

export const ErrorBoundaryWithLogging: FallbackStory = {
  render: function LoggingDemo() {
    const [hasError, setHasError] = useState(false)
    const [logs, setLogs] = useState<string[]>([])
    const [key, setKey] = useState(0)

    const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
      setHasError(true)
      setLogs((prev) => [
        ...prev,
        `[${new Date().toISOString()}] Error: ${error.message}`,
        `  Component stack: ${errorInfo.componentStack?.split("\n")[1]?.trim() || "N/A"}`,
      ])
    }

    const handleReset = () => {
      setHasError(false)
      setKey((k) => k + 1)
      setLogs((prev) => [
        ...prev,
        `[${new Date().toISOString()}] Reset triggered`,
      ])
    }

    return (
      <div className="space-y-4">
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setHasError(true)}
            className="bg-destructive text-destructive-foreground rounded-md px-3 py-1.5 text-sm"
          >
            Trigger Error
          </button>
          {hasError && (
            <button
              onClick={handleReset}
              className="bg-muted text-muted-foreground rounded-md px-3 py-1.5 text-sm"
            >
              Reset
            </button>
          )}
        </div>
        <ErrorBoundary
          key={key}
          onError={handleError}
          onReset={handleReset}
          showErrorMessage
        >
          <BuggyComponent shouldThrow={hasError} />
        </ErrorBoundary>
        {logs.length > 0 && (
          <div className="bg-muted rounded-lg p-3">
            <p className="text-muted-foreground mb-2 text-xs font-medium uppercase">
              Error Logs
            </p>
            <pre className="text-muted-foreground max-h-32 overflow-auto text-xs">
              {logs.join("\n")}
            </pre>
          </div>
        )}
      </div>
    )
  },
  parameters: {
    docs: {
      description: {
        story:
          "ErrorBoundary with onError callback for logging. Shows how errors can be captured and sent to monitoring services like Sentry.",
      },
    },
  },
}
