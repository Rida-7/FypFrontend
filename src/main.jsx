import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from './components/LandingPage'
import SignIn from './pages/SignIn'
import SignUp from './pages/SignUp'
import Templates from './pages/Templates'
import './index.css'
import Integrations from './pages/Integrations'
import Boards from './pages/Boards'
import HeadingsPage from './pages/HeadingPage'
import GeneratedDocPage from './pages/GeneratedDocPage'
import DocumentsPage from "./pages/DocumentPage";
import DocumentDetail from "./pages/DocDetail";
import Dashboard from "./pages/Dashboard";
import SlackChannelSelector from "./pages/SlackChannelSelector";



createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Default route now shows Sign In */}
        <Route path='/' element={<LandingPage />} />
        <Route path='/signin' element={<SignIn />} />
        <Route path='/signup' element={<SignUp />} />
        <Route path='/integrations' element={<Integrations />} />
        <Route path='/boards' element={<Boards />} />
        <Route path="/templates/:boardId" element={<Templates />} />
        <Route path="/headings" element={<HeadingsPage />} />
        <Route path="/generated-doc" element={<GeneratedDocPage />} />
        <Route path="/documents" element={<DocumentsPage />} />
        <Route path="/documents/:template_name" element={<DocumentDetail />} />
        <Route path="/dashboard" element={ <Dashboard />} />
        <Route path="/slack" element={<SlackChannelSelector />} />



        {/* After login or signup, navigate here */}
        <Route path='/landing' element={<LandingPage />} />

        {/* Catch-all fallback */}
        <Route path='*' element={<Navigate to='/' replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
