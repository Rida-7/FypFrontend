import React from 'react'
import { Outlet } from 'react-router-dom'

export default function App() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white shadow-lg rounded-2xl p-8">
        <Outlet />
      </div>
    </div>
  )
}
