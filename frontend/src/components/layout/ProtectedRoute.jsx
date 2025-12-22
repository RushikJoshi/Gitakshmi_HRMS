import React from 'react';
import { Navigate } from 'react-router-dom';
import { getToken, isValidToken } from '../../utils/token';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, isInitialized } = useAuth();
  
  // Wait for auth to initialize
  if (!isInitialized) {
    return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  // Synchronously validate token presence and basic format
  const token = getToken();
  if (!isValidToken(token)) return <Navigate to="/login" replace />;

  // If role restrictions provided, verify current user has allowed role
  if (allowedRoles && allowedRoles.length > 0) {
    if (!user || !allowedRoles.includes(user.role)) return <Navigate to="/login" replace />;
  }

  return children;
}

