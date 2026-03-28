import { createContext, useContext, type ReactNode } from 'react';

const AdminContext = createContext(false);

export function AdminProvider({ children }: { children: ReactNode }) {
  const isAdmin = new URLSearchParams(window.location.search).get('admin') === 'true';
  return (
    <AdminContext.Provider value={isAdmin}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  return useContext(AdminContext);
}
