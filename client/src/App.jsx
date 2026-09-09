import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import Kiosk from './pages/Kiosk'

const App = () => {
  return (
    <main>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/kiosk" element={<Kiosk />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </main>
  )
}

export default App
