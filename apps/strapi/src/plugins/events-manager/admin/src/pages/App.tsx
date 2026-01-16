/**
 * Events Manager Plugin - Main App Component
 *
 * Defines the routing structure for the plugin with nested routes
 * and a shared layout with side navigation.
 */

import { Navigate, Route, Routes } from "react-router-dom"

import { PluginLayout } from "../components/PluginLayout"
import { DashboardPage } from "./Dashboard"
import { ImportPage } from "./Import"
import { PlanningPage } from "./Planning"
import { VenuesPage } from "./Venues"

const App = () => {
  return (
    <Routes>
      <Route element={<PluginLayout />}>
        {/* Default redirect to dashboard */}
        <Route index element={<Navigate to="dashboard" replace />} />

        {/* Main sections */}
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="planning" element={<PlanningPage />} />
        <Route path="venues" element={<VenuesPage />} />
        <Route path="import" element={<ImportPage />} />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Route>
    </Routes>
  )
}

export default App
export { App }
