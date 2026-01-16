/**
 * PluginLayout Component
 *
 * Shared layout wrapper for the entity-properties plugin.
 * Provides side navigation and main content area.
 */

import { Layouts } from "@strapi/strapi/admin"
import { Outlet } from "react-router-dom"

import { SideNav } from "../SideNav"

export function PluginLayout() {
  return (
    <Layouts.Root sideNav={<SideNav />}>
      <Outlet />
    </Layouts.Root>
  )
}
