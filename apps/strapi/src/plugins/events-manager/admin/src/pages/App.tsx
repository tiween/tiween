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

const App = () => {
  return (
    <Routes>
      <Route element={<PluginLayout />}>
        {/* Default redirect to dashboard */}
        <Route index element={<Navigate to="dashboard" replace />} />

        {/* Main sections */}
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="planning" element={<PlanningPage />} />
        {/*
          `venues` is GONE from this plugin (story 2D.2): the venue list and
          form now live in the venues plugin, once. The catch-all below sends
          any stale bookmark to the dashboard rather than to a blank route.
        */}
        <Route path="import" element={<ImportPage />} />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Route>
    </Routes>
  )
}

export default App
export { App }
