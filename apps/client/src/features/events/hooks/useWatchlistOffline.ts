"use client"

import * as React from "react"

import type { WatchlistItem } from "./useWatchlist"

const DB_NAME = "tiween_watchlist"
const DB_VERSION = 1
const STORE_NAME = "watchlist"

/**
 * IndexedDB utility for offline watchlist storage
 *
 * Features:
 * - Stores watchlist items locally for offline access
 * - Syncs with server data when online
 * - Gracefully degrades when IndexedDB is unavailable
 */

/**
 * Open or create the IndexedDB database
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB not available"))
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // Create watchlist object store with documentId as key
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: "documentId",
        })
        // Index for querying by creativeWork documentId
        store.createIndex("creativeWorkId", "creativeWork.documentId", {
          unique: false,
        })
        // Index for sorting by addedAt
        store.createIndex("addedAt", "addedAt", { unique: false })
      }
    }
  })
}

/**
 * Save watchlist items to IndexedDB
 */
async function saveToIndexedDB(items: WatchlistItem[]): Promise<void> {
  try {
    const db = await openDatabase()
    const transaction = db.transaction(STORE_NAME, "readwrite")
    const store = transaction.objectStore(STORE_NAME)

    // Clear existing data
    store.clear()

    // Add all items
    for (const item of items) {
      store.add(item)
    }

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        db.close()
        resolve()
      }
      transaction.onerror = () => {
        db.close()
        reject(transaction.error)
      }
    })
  } catch (error) {
    console.warn("[Watchlist] Failed to save to IndexedDB:", error)
  }
}

/**
 * Load watchlist items from IndexedDB
 */
async function loadFromIndexedDB(): Promise<WatchlistItem[]> {
  try {
    const db = await openDatabase()
    const transaction = db.transaction(STORE_NAME, "readonly")
    const store = transaction.objectStore(STORE_NAME)

    return new Promise((resolve, reject) => {
      const request = store.getAll()

      request.onsuccess = () => {
        db.close()
        const items = request.result as WatchlistItem[]
        // Sort by addedAt descending
        items.sort(
          (a, b) =>
            new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
        )
        resolve(items)
      }
      request.onerror = () => {
        db.close()
        reject(request.error)
      }
    })
  } catch (error) {
    console.warn("[Watchlist] Failed to load from IndexedDB:", error)
    return []
  }
}

/**
 * Check if a creative work is in the offline watchlist
 */
async function isInOfflineWatchlist(creativeWorkId: string): Promise<boolean> {
  try {
    const db = await openDatabase()
    const transaction = db.transaction(STORE_NAME, "readonly")
    const store = transaction.objectStore(STORE_NAME)
    const index = store.index("creativeWorkId")

    return new Promise((resolve) => {
      const request = index.get(creativeWorkId)

      request.onsuccess = () => {
        db.close()
        resolve(!!request.result)
      }
      request.onerror = () => {
        db.close()
        resolve(false)
      }
    })
  } catch {
    return false
  }
}

/**
 * Clear all watchlist items from IndexedDB
 */
async function clearIndexedDB(): Promise<void> {
  try {
    const db = await openDatabase()
    const transaction = db.transaction(STORE_NAME, "readwrite")
    const store = transaction.objectStore(STORE_NAME)
    store.clear()

    return new Promise((resolve) => {
      transaction.oncomplete = () => {
        db.close()
        resolve()
      }
      transaction.onerror = () => {
        db.close()
        resolve()
      }
    })
  } catch {
    // Ignore errors
  }
}

/**
 * Hook for offline watchlist functionality
 *
 * Features:
 * - Syncs server watchlist to IndexedDB when online
 * - Provides offline data when network is unavailable
 * - Tracks online/offline status
 *
 * @example
 * ```tsx
 * const { offlineWatchlist, isOnline, syncStatus } = useWatchlistOffline(serverWatchlist)
 *
 * // Use offlineWatchlist when offline, serverWatchlist when online
 * const watchlist = isOnline ? serverWatchlist : offlineWatchlist
 * ```
 */
export function useWatchlistOffline(
  serverWatchlist: WatchlistItem[] | undefined
) {
  const [offlineWatchlist, setOfflineWatchlist] = React.useState<
    WatchlistItem[]
  >([])
  const [isOnline, setIsOnline] = React.useState(true)
  const [syncStatus, setSyncStatus] = React.useState<
    "idle" | "syncing" | "synced" | "error"
  >("idle")

  // Track online/offline status
  React.useEffect(() => {
    if (typeof window === "undefined") return

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    setIsOnline(navigator.onLine)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  // Load from IndexedDB on mount
  React.useEffect(() => {
    loadFromIndexedDB().then(setOfflineWatchlist)
  }, [])

  // Sync server data to IndexedDB when available
  React.useEffect(() => {
    if (!serverWatchlist || serverWatchlist.length === 0) return

    const sync = async () => {
      setSyncStatus("syncing")
      try {
        await saveToIndexedDB(serverWatchlist)
        setOfflineWatchlist(serverWatchlist)
        setSyncStatus("synced")
      } catch {
        setSyncStatus("error")
      }
    }

    sync()
  }, [serverWatchlist])

  // Check if a specific item is in offline watchlist
  const checkOfflineWatchlist = React.useCallback(
    async (creativeWorkId: string): Promise<boolean> => {
      return isInOfflineWatchlist(creativeWorkId)
    },
    []
  )

  // Clear offline data (e.g., on logout)
  const clearOfflineData = React.useCallback(async () => {
    await clearIndexedDB()
    setOfflineWatchlist([])
  }, [])

  return {
    /** Watchlist items from IndexedDB */
    offlineWatchlist,
    /** Whether the device is online */
    isOnline,
    /** Sync status: idle | syncing | synced | error */
    syncStatus,
    /** Check if item is in offline watchlist */
    checkOfflineWatchlist,
    /** Clear all offline data */
    clearOfflineData,
    /** Best available watchlist (server if online, offline otherwise) */
    watchlist: isOnline && serverWatchlist ? serverWatchlist : offlineWatchlist,
  }
}
