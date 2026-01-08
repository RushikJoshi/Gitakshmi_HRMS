import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext';

// DEV: auto-inject a dev HR token into localStorage to help local development
try {
  const isDev = Boolean(import.meta.env && import.meta.env.DEV);
  const devToken = import.meta.env && import.meta.env.VITE_DEV_HR_TOKEN;
  if (isDev && devToken && !localStorage.getItem('token')) {
    localStorage.setItem('token', devToken);
    // also set axios default if AuthContext hasn't initialized yet
    if (window && window.localStorage) window.__HRMS_DEV_TOKEN_SET = true;
  }
} catch (e) {
  // ignore in build/SSR
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <AuthProvider>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </AuthProvider>
);
