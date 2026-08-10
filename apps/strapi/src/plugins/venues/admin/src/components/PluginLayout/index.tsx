/**
 * The venues plugin shell (Story 2D.2, S0): `Layouts.Root` + the left `SubNav`,
 * with the routed page rendered into the `<Outlet/>`.
 *
 * Replaces the `HomePage.tsx` placeholder this story removes.
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
