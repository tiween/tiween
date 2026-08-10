/**
 * Venues plugin routing (Story 2D.2, S0).
 *
 * Every route renders inside `PluginLayout` (`Layouts.Root` + `SubNav`), and
 * the index redirects to `venues` so the plugin lands on Lieux — the placeholder
 * `HomePage` this story replaced is gone.
 */
import { Navigate, Route, Routes } from "react-router-dom"

import { PluginLayout } from "../components/PluginLayout"
import { PropertiesPage } from "./Properties"
import { VenuesPage } from "./Venues"

const App = () => {
  return (
    <Routes>
      <Route element={<PluginLayout />}>
        <Route index element={<Navigate to="venues" replace />} />
        <Route path="venues" element={<VenuesPage />} />
        <Route path="properties" element={<PropertiesPage />} />
        {/* Anything else lands on the list rather than on a blank shell. */}
        <Route path="*" element={<Navigate to="venues" replace />} />
      </Route>
    </Routes>
  )
}

export default App
export { App }
