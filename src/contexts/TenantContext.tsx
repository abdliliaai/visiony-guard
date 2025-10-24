import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams } from 'react-router-dom';

interface TenantContextType {
  currentTenantId: string | null;
  setCurrentTenantId: (tenantId: string | null) => void;
  isImpersonating: boolean;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { profile } = useAuth();
  const [searchParams] = useSearchParams();
  const [currentTenantId, setCurrentTenantId] = useState<string | null>(null);
  
  // Check if we're viewing as a different tenant (impersonation for root_admin)
  const isImpersonating = currentTenantId !== null && currentTenantId !== profile?.tenant_id;

  useEffect(() => {
    // Check for tenant query parameter
    const tenantParam = searchParams.get('tenant');
    
    if (tenantParam) {
      // If there's a tenant parameter, use it (for MSSP navigation)
      setCurrentTenantId(tenantParam);
    } else if (profile?.tenant_id) {
      // Otherwise use the user's default tenant
      setCurrentTenantId(profile.tenant_id);
    }
  }, [searchParams, profile?.tenant_id]);

  return (
    <TenantContext.Provider value={{ currentTenantId, setCurrentTenantId, isImpersonating }}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};
