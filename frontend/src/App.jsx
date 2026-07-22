import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AuthForm from './components/AuthForm';
import AdminDashboard from './components/AdminDashboard';
import CandidateDashboard from './components/CandidateDashboard';
import RecruiterDashboard from './components/RecruiterDashboard'; // Aluth eka
import HiringManagerDashboard from './components/HiringManagerDashboard'; // Aluth eka

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        <Routes>
          <Route path="/" element={<AuthForm />} />
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
          <Route path="/candidate-dashboard" element={<CandidateDashboard />} />
          <Route path="/recruiter-dashboard" element={<RecruiterDashboard />} />
          <Route path="/hiring-manager-dashboard" element={<HiringManagerDashboard />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;