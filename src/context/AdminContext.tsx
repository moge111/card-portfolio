import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

const EDIT_MODE_KEY = 'portfolio-edit-mode';

interface AdminContextType {
  isAdmin: boolean;
  setAdmin: (value: boolean) => void;
}

const AdminContext = createContext<AdminContextType>({ isAdmin: false, setAdmin: () => {} });

export function AdminProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(() => {
    if (new URLSearchParams(window.location.search).get('admin') === 'true') return true;
    try {
      return localStorage.getItem(EDIT_MODE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const setAdmin = useCallback((value: boolean) => {
    setIsAdmin(value);
    try {
      localStorage.setItem(EDIT_MODE_KEY, String(value));
    } catch {
      // ignore storage errors
    }
  }, []);

  return (
    <AdminContext.Provider value={{ isAdmin, setAdmin }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  return useContext(AdminContext).isAdmin;
}

export function useAdminToggle() {
  return useContext(AdminContext);
}
