/**
 * MapPicker — address → "Localiser" → geocode → draggable pin (Story 2D.2, AC 4).
 *
 * Replaces the raw decimal latitude/longitude `TextInput`s wholesale: the venue
 * schema's single coordinate source is the `geo` (`shared.geo-point`) component
 * and an editor never types a decimal degree here. The resolved point is shown
 * READ-ONLY (`Typography`), never as an editable number.
 *
 * ## What is deliberately non-DS
 *
 * The tile canvas is the ONE sanctioned non-DS visual element (see
 * handoff/ds-component-binding.md § 6). It is framed in DS chrome
 * (`Field.Root` → `Box`), every colour it uses is a DS token
 * (`var(--colors-…)`), and the absolute pixel positioning is confined to the
 * tile grid and the pin — Web Mercator is defined in pixels at a zoom level, so
 * there is no DS spacing token that could express it.
 *
 * ## Why a hand-rolled tile grid instead of a map library
 *
 * `apps/strapi` has no mapping dependency, and adding Leaflet/MapLibre to the
 * ADMIN bundle for one field is a build-weight decision the story does not
 * make. A fixed-zoom tile grid with a draggable pin covers the interaction the
 * spec actually names (locate, then nudge the pin) in ~200 lines and no new
 * dependency. It does NOT pan or zoom — an editor who needs a distant point
 * re-geocodes a better address, which is the intended flow anyway.
 *
 * The canvas MEASURES itself (`ResizeObserver`) and the tile grid, the pointer
 * mapping and the pin offset are all driven from that measurement. An earlier
 * version painted at `width: 100%` while the maths assumed a fixed 768px, so at
 * any other width the map was off-centre and clicks resolved to the wrong point.
 *
 * ## Attribution
 *
 * The tile server and Nominatim BOTH require visible attribution — a licence
 * and ToS obligation, not decoration. It renders under the canvas, inside the
 * DS chrome, in every locale.
 *
 * ## Provider
 *
 * Injected as the `geocoder` prop (default {@link defaultGeocoder}); OQ-1 is
 * still open, see `./geocode.ts`.
 */
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react"
import {
  Box,
  Button,
  Field,
  Flex,
  Link,
  TextInput,
  Typography,
} from "@strapi/design-system"
import { PinMap } from "@strapi/icons"
import { useIntl } from "react-intl"

import type { Geocoder, GeoPoint } from "./geocode"
import type { PixelPoint } from "./projection"

import { errorTranslationKey } from "../../utils/errors"
import { getTranslation } from "../../utils/getTranslation"
import { defaultGeocoder, formatCoordinate, isValidGeoPoint } from "./geocode"
import { fromWorldPixel, TILE_SIZE, toWorldPixel, ZOOM } from "./projection"

/** The design width; the canvas may render narrower and the maths follows it. */
const DEFAULT_CANVAS_WIDTH = TILE_SIZE * 3
const CANVAS_HEIGHT = TILE_SIZE * 2

/** Where the map centres when nothing is set yet: downtown Tunis. */
const FALLBACK_CENTER: GeoPoint = { latitude: 36.8065, longitude: 10.1815 }

/** Keyboard nudge, in screen pixels (Shift multiplies it). */
const NUDGE_STEP = 2
const NUDGE_STEP_LARGE = 20

/** Abandon a geocode that has not answered in this long. */
const GEOCODE_TIMEOUT_MS = 10_000

interface MapPickerProps {
  /** The venue address; the picker owns the input so "Localiser" reads it live. */
  address: string
  onAddressChange: (address: string) => void
  /** The `geo` component value (`null` = no coordinates stored). */
  value: GeoPoint | null
  onChange: (value: GeoPoint | null) => void
  /** Swappable provider (OQ-1). */
  geocoder?: Geocoder
  disabled?: boolean
  /** An error CODE for the address field, mapped from the server. */
  error?: string
}

export function MapPicker({
  address,
  onAddressChange,
  value,
  onChange,
  geocoder = defaultGeocoder,
  disabled = false,
  error,
}: MapPickerProps) {
  const { formatMessage, messages } = useIntl()
  const t = useCallback(
    (id: string, values?: Record<string, string>) =>
      formatMessage({ id: getTranslation(id) }, values),
    [formatMessage]
  )

  const [isLocating, setIsLocating] = useState(false)
  const [geocodeError, setGeocodeError] = useState<string | null>(null)

  /**
   * The map CENTRE is separate from the pin: after a geocode both coincide, but
   * dragging the pin must not slide the tiles under the cursor.
   */
  const [center, setCenter] = useState<GeoPoint>(
    isValidGeoPoint(value) ? (value as GeoPoint) : FALLBACK_CENTER
  )

  const canvasRef = useRef<HTMLDivElement | null>(null)
  const isDragging = useRef(false)

  /* ------------------------------------------------------ measured geometry */
  const [canvasWidth, setCanvasWidth] = useState(DEFAULT_CANVAS_WIDTH)

  useLayoutEffect(() => {
    const element = canvasRef.current
    if (!element) return

    const measure = () => {
      const width = element.getBoundingClientRect().width
      if (width > 0) setCanvasWidth(width)
    }
    measure()

    // Absent in jsdom (and in older browsers); the initial measure above is the
    // fallback, so the component still renders — it just does not re-measure.
    if (typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  // Re-centre when the stored point changes from OUTSIDE (opening the modal on
  // another venue), but never while the editor is dragging the pin.
  useEffect(() => {
    if (isDragging.current) return
    if (isValidGeoPoint(value)) setCenter(value as GeoPoint)
  }, [value])

  const centerPixel = toWorldPixel(center)
  const topLeft: PixelPoint = {
    x: centerPixel.x - canvasWidth / 2,
    y: centerPixel.y - CANVAS_HEIGHT / 2,
  }

  /** The pin's position inside the canvas, or `null` when nothing is set. */
  const pinOffset = isValidGeoPoint(value)
    ? (() => {
        const pixel = toWorldPixel(value as GeoPoint)
        return { x: pixel.x - topLeft.x, y: pixel.y - topLeft.y }
      })()
    : null

  /* ---------------------------------------------------------------- geocode */

  /**
   * Sequence guard + abort. Two clicks on "Localiser" (or an edit between them)
   * must not let the SLOWER answer land last and overwrite the newer pin, and a
   * provider that never answers must not pin the button in its loading state
   * for the rest of the session.
   */
  const geocodeId = useRef(0)
  const inFlight = useRef<AbortController | null>(null)

  useEffect(
    () => () => {
      inFlight.current?.abort()
    },
    []
  )

  const locate = useCallback(async () => {
    if (!address.trim() || disabled) return

    const currentRequest = ++geocodeId.current
    inFlight.current?.abort()

    const controller = new AbortController()
    inFlight.current = controller
    const timeout = setTimeout(() => controller.abort(), GEOCODE_TIMEOUT_MS)

    setIsLocating(true)
    setGeocodeError(null)
    try {
      const point = await geocoder.geocode(address, {
        signal: controller.signal,
      })
      if (currentRequest !== geocodeId.current) return
      setCenter(point)
      onChange(point)
    } catch (err) {
      if (currentRequest !== geocodeId.current) return
      setGeocodeError((err as { code?: string })?.code ?? "GEOCODE_FAILED")
    } finally {
      clearTimeout(timeout)
      if (currentRequest === geocodeId.current) setIsLocating(false)
    }
  }, [address, disabled, geocoder, onChange])

  /* -------------------------------------------------------------- pin moves */

  const pointFromCanvasOffset = useCallback(
    (offsetX: number, offsetY: number): GeoPoint => {
      // Clamp inside the canvas: a pin dragged off the tiles would resolve to a
      // point the editor cannot see.
      const x = Math.min(Math.max(offsetX, 0), canvasWidth)
      const y = Math.min(Math.max(offsetY, 0), CANVAS_HEIGHT)
      return fromWorldPixel({ x: topLeft.x + x, y: topLeft.y + y })
    },
    [canvasWidth, topLeft.x, topLeft.y]
  )

  const handlePointerDown = useCallback(() => {
    if (disabled) return
    isDragging.current = true
  }, [disabled])

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging.current || disabled) return
      const rect = canvasRef.current?.getBoundingClientRect()
      onChange(
        pointFromCanvasOffset(
          rect ? event.clientX - rect.left : canvasWidth / 2,
          rect ? event.clientY - rect.top : CANVAS_HEIGHT / 2
        )
      )
    },
    [canvasWidth, disabled, onChange, pointFromCanvasOffset]
  )

  const handlePointerUp = useCallback(() => {
    isDragging.current = false
  }, [])

  /**
   * Arrow-key nudging — the non-pointer path. A coordinate that can only be
   * adjusted by dragging is unreachable for a keyboard-only editor, and
   * re-running the geocoder is not an alternative: it answers the address, not
   * the correction the editor is trying to make.
   */
  const handlePinKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLSpanElement>) => {
      if (disabled || !pinOffset) return

      const step = event.shiftKey ? NUDGE_STEP_LARGE : NUDGE_STEP
      const delta: Record<string, [number, number]> = {
        ArrowUp: [0, -step],
        ArrowDown: [0, step],
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
      }
      const move = delta[event.key]
      if (!move) return

      event.preventDefault()
      onChange(
        pointFromCanvasOffset(pinOffset.x + move[0], pinOffset.y + move[1])
      )
    },
    [disabled, onChange, pinOffset, pointFromCanvasOffset]
  )

  /* ----------------------------------------------------------------- tiles */

  const tiles: { key: string; url: string; left: number; top: number }[] = []
  const firstTileX = Math.floor(topLeft.x / TILE_SIZE)
  const firstTileY = Math.floor(topLeft.y / TILE_SIZE)
  const maxTile = 2 ** ZOOM
  const cols = Math.ceil(canvasWidth / TILE_SIZE) + 1
  const rows = Math.ceil(CANVAS_HEIGHT / TILE_SIZE) + 1
  for (let col = 0; col < cols; col += 1) {
    for (let row = 0; row < rows; row += 1) {
      const tileX = (((firstTileX + col) % maxTile) + maxTile) % maxTile
      const tileY = firstTileY + row
      if (tileY < 0 || tileY >= maxTile) continue
      tiles.push({
        key: `${tileX}-${tileY}`,
        url: `https://tile.openstreetmap.org/${ZOOM}/${tileX}/${tileY}.png`,
        left: (firstTileX + col) * TILE_SIZE - topLeft.x,
        top: tileY * TILE_SIZE - topLeft.y,
      })
    }
  }

  const hint = isLocating
    ? t("map.hint.searching")
    : pinOffset
      ? `${t("map.hint.located")} ${t("map.pin.hint")}`
      : t("map.hint.initial")

  const tCode = (code: string) =>
    formatMessage({
      id: getTranslation(
        errorTranslationKey(code, messages as Record<string, unknown>)
      ),
    })

  return (
    <Flex direction="column" alignItems="stretch" gap={2}>
      <Flex gap={2} alignItems="flex-end">
        <Box flex="1">
          <Field.Root name="address" error={error ? tCode(error) : undefined}>
            <Field.Label>{t("form.field.address")}</Field.Label>
            <TextInput
              value={address}
              disabled={disabled}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                onAddressChange(event.target.value)
              }
            />
            <Field.Error />
          </Field.Root>
        </Box>
        <Button
          variant="secondary"
          startIcon={<PinMap />}
          onClick={locate}
          loading={isLocating}
          disabled={disabled || !address.trim()}
        >
          {t("map.locate")}
        </Button>
      </Flex>

      <Field.Root
        name="geo"
        error={geocodeError ? tCode(geocodeError) : undefined}
      >
        <Field.Label>{t("map.label")}</Field.Label>
        <Box
          hasRadius
          overflow="hidden"
          borderColor="neutral200"
          background="neutral100"
        >
          {/*
            The tile canvas. Absolute pixel offsets are Web Mercator's own unit
            at a fixed zoom — no DS spacing token can express them — and this is
            the one element the DS binding sheet sanctions as non-DS.
          */}
          <div
            ref={canvasRef}
            role="presentation"
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            style={{
              position: "relative",
              width: "100%",
              maxWidth: `${DEFAULT_CANVAS_WIDTH}px`,
              height: `${CANVAS_HEIGHT}px`,
              overflow: "hidden",
              touchAction: "none",
              cursor: disabled ? "default" : "crosshair",
            }}
          >
            {tiles.map((tile) => (
              <img
                key={tile.key}
                src={tile.url}
                alt=""
                aria-hidden
                draggable={false}
                style={{
                  position: "absolute",
                  left: `${tile.left}px`,
                  top: `${tile.top}px`,
                  width: `${TILE_SIZE}px`,
                  height: `${TILE_SIZE}px`,
                  pointerEvents: "none",
                }}
              />
            ))}

            {pinOffset && (
              <span
                role="button"
                tabIndex={disabled ? -1 : 0}
                aria-label={t("map.pin")}
                aria-describedby="venues-map-hint"
                onPointerDown={handlePointerDown}
                onKeyDown={handlePinKeyDown}
                style={{
                  position: "absolute",
                  left: `${pinOffset.x}px`,
                  top: `${pinOffset.y}px`,
                  transform: "translate(-50%, -100%)",
                  color: "var(--colors-danger600)",
                  cursor: disabled ? "default" : "grab",
                  touchAction: "none",
                }}
              >
                <PinMap width={28} height={28} />
              </span>
            )}
          </div>
        </Box>
        <Field.Hint id="venues-map-hint">{hint}</Field.Hint>
        <Field.Error />
      </Field.Root>

      {/*
        Required by the OpenStreetMap tile-usage policy AND by Nominatim's ToS.
        Not decoration — removing it puts the deployment out of licence.
      */}
      <Typography variant="pi" textColor="neutral600">
        <Link
          href="https://www.openstreetmap.org/copyright"
          isExternal
          target="_blank"
          rel="noreferrer"
        >
          {t("map.attribution")}
        </Link>
      </Typography>

      <Flex justifyContent="space-between" alignItems="center" gap={2}>
        <Typography variant="pi" textColor="neutral600">
          {isValidGeoPoint(value)
            ? t("map.coordinates", {
                lat: formatCoordinate((value as GeoPoint).latitude),
                lng: formatCoordinate((value as GeoPoint).longitude),
              })
            : " "}
        </Typography>
        <Flex gap={2}>
          <Button
            variant="tertiary"
            onClick={locate}
            disabled={disabled || !address.trim()}
          >
            {t("map.useAddress")}
          </Button>
          {isValidGeoPoint(value) && (
            <Button
              variant="tertiary"
              onClick={() => onChange(null)}
              disabled={disabled}
            >
              {t("map.clear")}
            </Button>
          )}
        </Flex>
      </Flex>
    </Flex>
  )
}
