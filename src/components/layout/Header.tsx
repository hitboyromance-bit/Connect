import { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, ChevronDown, LogOut, Search, Settings as SettingsIcon, User } from 'lucide-react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { confirmLogout } from '../../utils/logoutWarning';
import { clearCurrentUser, getCurrentUserDisplay } from '../../utils/currentUser';
import './Header.css';

interface HeaderProps {
  title: string;
  notificationCount?: number;
}

type SearchRole = 'admin' | 'manager' | 'employee' | 'pending' | 'removed' | 'approved';

interface SearchItem {
  label: string;
  description: string;
  path: string;
  roles: SearchRole[];
  keywords: string[];
}

const searchItems: SearchItem[] = [
  {
    label: 'Dashboard',
    description: 'Admin overview, active employees, hours, payroll summary',
    path: '/',
    roles: ['admin', 'manager'],
    keywords: ['home', 'overview', 'stats', 'summary', 'admin dashboard'],
  },
  {
    label: 'Employee Management',
    description: 'Browse, search, add, edit, or remove employees',
    path: '/employees',
    roles: ['admin', 'manager'],
    keywords: ['employee', 'employees', 'staff', 'team', 'add employee', 'edit employee', 'department', 'position'],
  },
  {
    label: 'Work Schedule',
    description: 'View or manage weekly schedules and shift times',
    path: '/work-schedule',
    roles: ['admin', 'manager', 'employee'],
    keywords: ['schedule', 'shift', 'weekly', 'hours', 'start time', 'end time', 'working days'],
  },
  {
    label: 'Time Clock',
    description: 'Clock in, clock out, meal breaks, and time records',
    path: '/timeclock',
    roles: ['admin', 'manager', 'employee'],
    keywords: ['time', 'clock', 'clock in', 'clock out', 'meal', 'break', 'records', 'hours worked'],
  },
  {
    label: 'Payroll',
    description: 'Payroll totals, pending payroll, and pay records',
    path: '/payroll',
    roles: ['admin'],
    keywords: ['payroll', 'pay', 'salary', 'wage', 'money', 'pending payroll'],
  },
  {
    label: 'My Payroll',
    description: 'Your pay history, hours, status, and pay dates',
    path: '/my-payroll',
    roles: ['employee', 'approved'],
    keywords: ['my payroll', 'pay history', 'paycheck', 'paystub', 'paid', 'net pay'],
  },
  {
    label: 'Reports',
    description: 'Employee hours, payroll totals, and audit history',
    path: '/reports',
    roles: ['admin', 'manager'],
    keywords: ['reports', 'report', 'audit', 'hours report', 'payroll report', 'activity log'],
  },
  {
    label: 'Notifications',
    description: 'Messages, alerts, schedule and payroll updates',
    path: '/notifications',
    roles: ['admin', 'manager', 'employee'],
    keywords: ['notification', 'notifications', 'alerts', 'messages', 'bell', 'unread'],
  },
  {
    label: 'Settings',
    description: 'Profile, notification, security, and appearance settings',
    path: '/settings',
    roles: ['admin', 'manager', 'employee'],
    keywords: ['settings', 'profile settings', 'security', 'password', 'appearance', 'theme'],
  },
  {
    label: 'Admin Profile',
    description: 'Admin account details and permissions',
    path: '/admin',
    roles: ['admin'],
    keywords: ['admin', 'profile', 'account', 'permissions'],
  },
];

function getSearchResults(role: string, query: string) {
  const normalizedRole = role === 'approved' ? 'employee' : role;
  const search = query.trim().toLowerCase();
  if (!search) return [];

  return searchItems
    .filter(item => item.roles.includes(normalizedRole as SearchRole))
    .map(item => {
      const haystack = [item.label, item.description, ...item.keywords].join(' ').toLowerCase();
      const score = item.label.toLowerCase().includes(search) ? 2 : haystack.includes(search) ? 1 : 0;
      return { ...item, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
    .slice(0, 6);
}

export function Header({ title, notificationCount = 0 }: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const currentUser = getCurrentUserDisplay();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLFormElement>(null);
  const searchValue = searchParams.get('search') || '';
  const searchResults = useMemo(
    () => getSearchResults(currentUser.user?.role || 'employee', searchValue),
    [currentUser.user?.role, searchValue]
  );

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setIsSearchOpen(false);
      }

      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setIsUserMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsUserMenuOpen(false);
        setIsSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const handleOpenSettings = () => {
    setIsUserMenuOpen(false);
    navigate('/settings');
  };

  const handleOpenProfile = () => {
    setIsUserMenuOpen(false);
    navigate('/admin');
  };

  const handleLogout = () => {
    if (!confirmLogout()) return;
    setIsUserMenuOpen(false);
    clearCurrentUser();
    navigate('/login');
  };

  const handleSearchChange = (value: string) => {
    const nextParams = new URLSearchParams(searchParams);
    if (value.trim()) {
      nextParams.set('search', value);
    } else {
      nextParams.delete('search');
    }
    setSearchParams(nextParams, { replace: true });
  };

  const handleSearchSubmit = () => {
    const search = searchValue.trim();
    if (!search) return;

    const destination = searchResults[0]?.path || (currentUser.user?.role === 'admin' ? '/employees' : '/timeclock');
    if (location.pathname !== destination) {
      navigate(`${destination}?search=${encodeURIComponent(search)}`);
    }
    setIsSearchOpen(false);
  };

  const handleSearchResult = (path: string) => {
    const search = searchValue.trim();
    const searchableDataPage = path === '/employees' || path === '/timeclock';
    navigate(searchableDataPage && search ? `${path}?search=${encodeURIComponent(search)}` : path);
    setIsSearchOpen(false);
  };

  return (
    <header className="header">
      <div className="header-left">
        <h1 className="header-title">{title}</h1>
      </div>

      <div className="header-right">
        <form
          className="search-box"
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            handleSearchSubmit();
          }}
          ref={searchRef}
        >
          <button type="submit" className="search-submit" aria-label="Search">
            <Search size={18} />
          </button>
          <input 
            type="text" 
            placeholder="Search..." 
            className="search-input"
            value={searchValue}
            onChange={(event) => handleSearchChange(event.target.value)}
            onFocus={() => setIsSearchOpen(true)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                handleSearchChange('');
                setIsSearchOpen(false);
              }
            }}
          />
          {isSearchOpen && searchValue.trim() && (
            <div className="global-search-results">
              {searchResults.length > 0 ? (
                searchResults.map((result) => (
                  <button
                    key={`${result.path}-${result.label}`}
                    type="button"
                    className="global-search-result"
                    onClick={() => handleSearchResult(result.path)}
                  >
                    <span>{result.label}</span>
                    <small>{result.description}</small>
                  </button>
                ))
              ) : (
                <div className="global-search-empty">
                  Press Enter to search records for "{searchValue}".
                </div>
              )}
            </div>
          )}
        </form>

        <button 
          className="notification-btn"
          onClick={() => navigate('/notifications')}
        >
          <Bell size={20} />
          {notificationCount > 0 && (
            <span className="notification-badge">{notificationCount}</span>
          )}
        </button>

        <div className="user-menu-wrapper" ref={userMenuRef}>
          <button
            className={`user-menu ${isUserMenuOpen ? 'open' : ''}`}
            type="button"
            onClick={() => setIsUserMenuOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={isUserMenuOpen}
          >
            <span className="user-avatar">
              <User size={20} />
            </span>
            <span className="user-info">
              <span className="user-name">{currentUser.name}</span>
              <span className="user-role">{currentUser.role}</span>
            </span>
            <ChevronDown className="user-menu-chevron" size={16} />
          </button>

          {isUserMenuOpen && (
            <div className="user-dropdown" role="menu">
              <div className="user-dropdown-header">
                <span className="dropdown-name">{currentUser.name}</span>
                <span className="dropdown-email">{currentUser.email}</span>
              </div>
              <button type="button" className="user-dropdown-item" onClick={handleOpenProfile}>
                <User size={16} />
                <span>Profile</span>
              </button>
              <button type="button" className="user-dropdown-item" onClick={handleOpenSettings}>
                <SettingsIcon size={16} />
                <span>Profile settings</span>
              </button>
              <button type="button" className="user-dropdown-item danger" onClick={handleLogout}>
                <LogOut size={16} />
                <span>Log out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
