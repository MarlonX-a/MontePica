import { createContext, useContext, useState } from 'react';
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

  return (
    <AdminContext.Provider
      value={{
        products,
        setProducts,
        categories,
        setCategories,
        tables,
        setTables,
        users,
        setUsers,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  return useContext(AdminContext);
}
