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
import { WorksListPage } from "./Works"
import { WorkFormPage } from "./Works/WorkFormPage"

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
          Works catalog: the list navigates to these four targets
          (`works/new`, `works/:documentId`, `works/:documentId/edit`). Both
          pages existed but were routed nowhere, so the catalog was
          unreachable from the admin.
        */}
        <Route path="works" element={<WorksListPage />} />
        <Route path="works/new" element={<WorkFormPage />} />
        <Route path="works/:documentId" element={<WorkFormPage />} />
        <Route path="works/:documentId/edit" element={<WorkFormPage />} />
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
