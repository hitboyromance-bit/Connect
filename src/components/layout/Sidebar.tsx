import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Clock, 
  CalendarDays,
  DollarSign, 
  BarChart3,
  Bell, 
  Settings,
  Menu,
  X,
  LogOut
} from 'lucide-react';
import { getCurrentUser } from '../../utils/currentUser';
import './Sidebar.css';

interface SidebarProps {
  onLogout: () => void;
}

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'manager'] },
  { path: '/employees', icon: Users, label: 'Employees', roles: ['admin', 'manager'] },
  { path: '/work-schedule', icon: CalendarDays, label: 'Work Schedule', roles: ['admin', 'manager', 'employee'] },
  { path: '/timeclock', icon: Clock, label: 'Time Clock', roles: ['admin', 'manager', 'employee'] },
  { path: '/payroll', icon: DollarSign, label: 'Payroll', roles: ['admin'] },
  { path: '/my-payroll', icon: DollarSign, label: 'My Payroll', roles: ['employee'] },
  { path: '/reports', icon: BarChart3, label: 'Reports', roles: ['admin', 'manager'] },
  { path: '/notifications', icon: Bell, label: 'Notifications', roles: ['admin', 'manager', 'employee'] },
  { path: '/settings', icon: Settings, label: 'Settings', roles: ['admin', 'manager', 'employee'] },
];

export function Sidebar({ onLogout }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(getCurrentUser());
  const visibleNavItems = navItems.filter(item => item.roles.includes(currentUser?.role || 'admin'));

  useEffect(() => {
    const updateUser = () => setCurrentUser(getCurrentUser());
    window.addEventListener('current-user-updated', updateUser);
    window.addEventListener('storage', updateUser);

    return () => {
      window.removeEventListener('current-user-updated', updateUser);
      window.removeEventListener('storage', updateUser);
    };
  }, []);

  return (
    <>
      {/* Mobile toggle button */}
      <button 
        className="sidebar-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle sidebar"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="sidebar-overlay" 
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <span className="logo-icon">CN</span>
            <span className="logo-text">Connect</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setIsOpen(false)}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={onLogout}>
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
