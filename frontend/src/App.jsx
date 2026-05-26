import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage.jsx';
import NeuroNexApp from './pages/HomePage.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/"     element={<LandingPage />} />
      <Route path="/chat" element={<NeuroNexApp />} />
      {/* Catch-all → home */}
      <Route path="*"     element={<Navigate to="/" replace />} />
    </Routes>
  );
}
