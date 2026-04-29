import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useState, useEffect } from 'react';
import { firebaseService } from '../../services/firebase';
import type { Notification } from '../../types';
import { confirmLogout } from '../../utils/logoutWarning';
import { clearCurrentUser, getCurrentUser } from '../../utils/currentUser';
import './Layout.css';

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/employees': 'Employee Management',
  '/timeclock': 'Time Clock',
  '/payroll': 'Payroll',
  '/my-payroll': 'My Payroll',
  '/reports': 'Reports',
  '/notifications': 'Notifications',
  '/settings': 'Settings',
  '/admin': 'Admin Profile',
  '/work-schedule': 'Work Schedule',
};

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationCount, setNotificationCount] = useState(0);

  const title = pageTitles[location.pathname] || 'HR System';

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    const result = await firebaseService.getNotifications();
    if (result.success && result.data) {
      const user = getCurrentUser();
      const visibleNotifications = result.data.filter(notification =>
        user?.role === 'admin' || user?.role === 'manager' || notification.userId === user?.uid || notification.userId === 'all'
      );
      setNotifications(visibleNotifications);
      setNotificationCount(visibleNotifications.filter(n => !n.read).length);
    }
  };

  const handleLogout = () => {
    if (!confirmLogout()) return;
    clearCurrentUser();
    navigate('/login');
  };

  return (
    <div className="layout">
      <Sidebar onLogout={handleLogout} />
      <main className="main-content">
        <Header title={title} notificationCount={notificationCount} />
        <div className="page-content">
          <Outlet context={{ notifications, refreshNotifications: loadNotifications }} />
        </div>
      </main>
    </div>
  );
}
