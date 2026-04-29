import type { User } from '../types';

export function getRoleHomePath(user: User | null) {
  return user?.role === 'employee' ? '/work-schedule' : '/';
}
