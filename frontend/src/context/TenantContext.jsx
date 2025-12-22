/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useState } from 'react';

export const TenantContext = createContext(null);

export function TenantProvider({ children }) {
  const [tenant, setTenant] = useState(null);
  return <TenantContext.Provider value={{ tenant, setTenant }}>{children}</TenantContext.Provider>;
}
