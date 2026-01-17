"use client"

import * as React from "react"
import { AlertCircle, Loader2, MapPin, Navigation, X } from "lucide-react"

import type { Coordinates } from "@/lib/geolocation"

import { useGeolocation } from "@/lib/geolocation"
import { cn } from "@/lib/utils"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

/**
 * Localized labels for NearMeButton
 */
export interface NearMeButtonLabels {
  nearMe: string
  locating: string
  locationDenied: string
  locationError: string
  enableLocation: string
  clear: string
  usingLocation: string
}

const defaultLabels: NearMeButtonLabels = {
  nearMe: "Près de moi",
  locating: "Localisation...",
  locationDenied: "Accès à la position refusé",
  locationError: "Erreur de localisation",
  enableLocation:
    "Veuillez activer la localisation dans les paramètres de votre navigateur",
  clear: "Effacer",
  usingLocation: "Utilisant votre position",
}

export interface NearMeButtonProps {
  /** Called when location is successfully obtained */
  onLocationChange?: (location: Coordinates | null) => void
  /** Whether the near me filter is active */
  isActive?: boolean
  /** Additional class names */
  className?: string
  /** Localized labels */
  labels?: NearMeButtonLabels
  /** Button variant */
  variant?: "default" | "outline" | "ghost"
  /** Button size */
  size?: "default" | "sm" | "lg" | "icon"
  /** Show error alert instead of tooltip */
  showErrorAlert?: boolean
}

/**
 * NearMeButton - Geolocation trigger button
 *
 * Features:
 * - Requests browser geolocation permission
 * - Shows loading state during location fetch
 * - Handles permission denied and error states
 * - Caches location for session
 * - Toggle off to clear location filter
 *
 * @example
 * ```tsx
 * function FilterBar() {
 *   const [nearMeLocation, setNearMeLocation] = useState<Coordinates | null>(null)
 *
 *   return (
 *     <NearMeButton
 *       onLocationChange={setNearMeLocation}
 *       isActive={nearMeLocation !== null}
 *     />
 *   )
 * }
 * ```
 */
export function NearMeButton({
  onLocationChange,
  isActive = false,
  className,
  labels = defaultLabels,
  variant = "outline",
  size = "default",
  showErrorAlert = false,
}: NearMeButtonProps) {
  const {
    position,
    status,
    error,
    isSupported,
    requestLocation,
    clearLocation,
  } = useGeolocation()

  // Notify parent when location changes
  React.useEffect(() => {
    onLocationChange?.(position)
  }, [position, onLocationChange])

  // Handle button click
  const handleClick = () => {
    if (isActive && position) {
      // Clear the location filter
      clearLocation()
      onLocationChange?.(null)
    } else {
      // Request location
      requestLocation()
    }
  }

  // Determine button state
  const isLoading = status === "loading"
  const isDenied = status === "denied"
  const hasError = status === "error"

  // Button icon
  const Icon = isLoading ? Loader2 : isActive ? Navigation : MapPin

  // Don't render if geolocation not supported
  if (!isSupported) {
    return null
  }

  // Build button content
  const buttonContent = (
    <Button
      variant={isActive ? "default" : variant}
      size={size}
      onClick={handleClick}
      disabled={isLoading}
      className={cn(
        "gap-2",
        isActive && "bg-primary text-primary-foreground",
        className
      )}
      aria-pressed={isActive}
      aria-label={isActive ? labels.usingLocation : labels.nearMe}
    >
      <Icon
        className={cn(
          "h-4 w-4",
          isLoading && "animate-spin",
          isActive && "fill-current"
        )}
      />
      {size !== "icon" && (
        <span>
          {isLoading
            ? labels.locating
            : isActive
              ? labels.nearMe
              : labels.nearMe}
        </span>
      )}
      {isActive && size !== "icon" && <X className="h-3 w-3 opacity-70" />}
    </Button>
  )

  // Show error alert if configured
  if (showErrorAlert && (isDenied || hasError) && error) {
    return (
      <div className="space-y-2">
        {buttonContent}
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="text-sm">
            {isDenied ? labels.locationDenied : labels.locationError}
          </AlertTitle>
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  // Show tooltip for errors
  if ((isDenied || hasError) && error) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{buttonContent}</TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[250px] text-center">
            <p className="font-medium">
              {isDenied ? labels.locationDenied : labels.locationError}
            </p>
            <p className="text-muted-foreground text-xs">{error}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return buttonContent
}

NearMeButton.displayName = "NearMeButton"
