/**
 * Entity Properties Plugin - Main App Component
 *
 * Defines the routing structure for the plugin with nested routes
 * and a shared layout with side navigation.
 */

import { Navigate, Route, Routes } from "react-router-dom"

import { PluginLayout } from "../components/PluginLayout"
import { CategoriesPage } from "./Categories"
import { DefinitionsPage } from "./Definitions"
import { HomePage } from "./HomePage"

const App = () => {
  return (
    <Routes>
      <Route element={<PluginLayout />}>
        {/* Default redirect to home */}
        <Route index element={<Navigate to="home" replace />} />

        {/* Main sections */}
        <Route path="home" element={<HomePage />} />
        <Route path="definitions" element={<DefinitionsPage />} />
        <Route path="categories" element={<CategoriesPage />} />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="home" replace />} />
      </Route>
    </Routes>
  )
}

export default App
export { App }
