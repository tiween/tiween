import { Route, Routes } from "react-router-dom"

import { HomePage } from "./HomePage"

const App = () => {
  return (
    <Routes>
      <Route index element={<HomePage />} />
    </Routes>
  )
}

export default App
export { App }
