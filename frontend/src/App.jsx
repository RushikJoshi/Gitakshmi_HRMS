import React from "react";
import AppRoutes from "./router/AppRoutes";

// Context Providers
import { AuthProvider } from "./context/AuthContext";
import { UIProvider } from "./context/UIContext";
import { TenantProvider } from "./context/TenantContext";

export default function App() {
  return (
    <AuthProvider>
      <TenantProvider>
        <UIProvider>
          <div className="min-h-screen bg-gray-50">
            <AppRoutes />
          </div>
        </UIProvider>
      </TenantProvider>
    </AuthProvider>
  );
}
