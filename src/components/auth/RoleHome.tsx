import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getCurrentUser } from '../../utils/currentUser';
import { getRoleHomePath } from '../../utils/roleNavigation';
import { Dashboard } from '../../pages/Dashboard';
import type { User } from '../../types';

export function RoleHome() {
  const [user, setUser] = useState<User | null>(getCurrentUser());

  useEffect(() => {
    const updateUser = () => setUser(getCurrentUser());
    window.addEventListener('current-user-updated', updateUser);
    window.addEventListener('storage', updateUser);

    return () => {
      window.removeEventListener('current-user-updated', updateUser);
      window.removeEventListener('storage', updateUser);
    };
  }, []);

  if (user?.role === 'employee') {
    return <Navigate to={getRoleHomePath(user)} replace />;
  }

  return <Dashboard />;
}
