import { createContext, useContext, useMemo, useState } from 'react';
import {
  initialCategories,
  initialProducts,
  initialTables,
  initialUsers,
} from '@/features/admin/data/adminData';

const AdminContext = createContext(null);

export default function AdminProvider({ children }) {
  const [products, setProducts] = useState(initialProducts);
  const [categories, setCategories] = useState(initialCategories);
  const [tables, setTables] = useState(initialTables);
  const [users, setUsers] = useState(initialUsers);
  const value = useMemo(
    () => ({
      products,
      setProducts,
      categories,
      setCategories,
      tables,
      setTables,
      users,
      setUsers,
    }),
    [products, categories, tables, users],
  );

  return (
    <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
  );
}

export function useAdmin() {
  return useContext(AdminContext);
}
