import type { User } from '../types';

const currentUserKey = 'hr-current-user';

export function normalizeCurrentUser(user: User): User {
  return {
    ...user,
    role: user.role === 'approved' ? 'employee' : user.role,
  };
}

export function getCurrentUser(): User | null {
  const stored = localStorage.getItem(currentUserKey);
  if (!stored) return null;

  try {
    return normalizeCurrentUser(JSON.parse(stored) as User);
  } catch {
    return null;
  }
}

export function setCurrentUser(user: User) {
  localStorage.setItem(currentUserKey, JSON.stringify(normalizeCurrentUser(user)));
  window.dispatchEvent(new Event('current-user-updated'));
}

export function clearCurrentUser() {
  localStorage.removeItem(currentUserKey);
  window.dispatchEvent(new Event('current-user-updated'));
}

export function getCurrentUserDisplay() {
  const user = getCurrentUser();
  const name = user?.name || user?.email || 'Admin User';
  const email = user?.email || 'No email';
  const role = user?.role === 'admin'
    ? 'Administrator'
    : user?.role === 'manager'
      ? 'Manager'
      : user?.role === 'employee'
        ? 'Employee'
        : user?.role || 'User';

  return { user, name, email, role };
}
