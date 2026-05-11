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
import GitHubRepoSelector from "./pages/GitHubRepoSelector";
import Analytics from "./pages/Analytics";
import PricingPage from "./pages/PricingPage";
import SubscriptionPage from "./pages/SubscriptionPage";
import PaymentPage from "./pages/PaymentPage";
// import PaymentSuccess from "./pages/PaymentSuccess";
import TeamWorkspacePage from "./pages/TeamWorkspacePage";
import AdminDashboard from "./pages/AdminDashboard";



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
        
        <Route path="/github/repos" element={<GitHubRepoSelector />} />
        <Route path="/analytics" element={<Analytics />} />

        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/subscription" element={<SubscriptionPage />} />

        {/* ================= PAYMENT FLOW ================= */}
        <Route path="/payment" element={<PaymentPage />} />
        {/* <Route path="/payment-success" element={<PaymentSuccess />} /> */}
        <Route path="/workspace" element={<TeamWorkspacePage />} />



        {/* After login or signup, navigate here */}
        <Route path='/landing' element={<LandingPage />} />
        <Route path="/admin" element={<AdminDashboard />} />

        {/* Catch-all fallback */}
        <Route path='*' element={<Navigate to='/' replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
