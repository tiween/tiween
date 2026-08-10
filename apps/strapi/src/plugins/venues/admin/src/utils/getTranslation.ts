import { PLUGIN_ID } from "../pluginId"

/**
 * Namespace a translation key with the plugin id.
 *
 * `registerTrads` (see `../index.tsx`) loads `translations/<locale>.json` into
 * the admin's ONE global message catalogue, so every key in those files is
 * already prefixed with `venues.`. Building ids by hand invites a key that
 * exists in the file but not in the catalogue (and vice versa), which react-intl
 * reports only as the raw id rendered on screen.
 */
export const getTranslation = (id: string): string => `${PLUGIN_ID}.${id}`
