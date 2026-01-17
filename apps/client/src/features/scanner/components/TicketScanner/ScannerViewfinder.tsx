"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

export interface ScannerViewfinderProps {
  /** Whether scanner is actively scanning */
  isScanning?: boolean
  /** Placeholder for camera preview (Storybook) */
  showPlaceholder?: boolean
  /** Additional class names */
  className?: string
}

/**
 * ScannerViewfinder - Camera viewfinder with scan guide overlay
 *
 * Features:
 * - Corner brackets to guide QR positioning
 * - Scanning animation (moving line)
 * - High contrast design for dark venues
 * - Placeholder mode for Storybook
 *
 * In production, the actual camera feed is rendered behind this overlay.
 * This component only provides the visual guide/frame.
 */
export function ScannerViewfinder({
  isScanning = true,
  showPlaceholder = false,
  className,
}: ScannerViewfinderProps) {
  return (
    <div
      className={cn(
        "relative aspect-square w-full max-w-[300px] overflow-hidden rounded-lg",
        className
      )}
    >
      {/* Placeholder background for Storybook */}
      {showPlaceholder && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900">
          {/* Simulated camera noise */}
          <div className="absolute inset-0 opacity-30">
            <div
              className="h-full w-full"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
              }}
            />
          </div>
          {/* Centered QR placeholder */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-white/10">
              <svg
                className="h-16 w-16 text-white/40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
                <rect x="14" y="14" width="3" height="3" />
                <rect x="18" y="14" width="3" height="3" />
                <rect x="14" y="18" width="3" height="3" />
                <rect x="18" y="18" width="3" height="3" />
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* Scan guide overlay */}
      <div className="pointer-events-none absolute inset-0">
        {/* Corner brackets */}
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {/* Top-left corner */}
          <path
            d="M 5 20 L 5 5 L 20 5"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
          />
          {/* Top-right corner */}
          <path
            d="M 80 5 L 95 5 L 95 20"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
          />
          {/* Bottom-left corner */}
          <path
            d="M 5 80 L 5 95 L 20 95"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
          />
          {/* Bottom-right corner */}
          <path
            d="M 80 95 L 95 95 L 95 80"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>

        {/* Scanning line animation */}
        {isScanning && (
          <div className="absolute inset-x-4 h-0.5 animate-[scan_2s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-green-400 to-transparent" />
        )}
      </div>

      {/* Add custom animation keyframes via style tag */}
      <style jsx>{`
        @keyframes scan {
          0%,
          100% {
            top: 10%;
          }
          50% {
            top: 90%;
          }
        }
      `}</style>
    </div>
  )
}

ScannerViewfinder.displayName = "ScannerViewfinder"
