import { useState, useEffect } from 'react';
import { Bell, Calendar, Clock, DollarSign, Settings, Check, CheckCheck } from 'lucide-react';
import { Card, CardContent } from '../components/common/Card';
import { firebaseService } from '../services/firebase';
import { getCurrentUser } from '../utils/currentUser';
import type { Notification } from '../types';
import './Notifications.css';

export function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    const result = await firebaseService.getNotifications();
    if (result.success && result.data) {
      const user = getCurrentUser();
      setNotifications(result.data.filter(notification =>
        user?.role === 'admin' || user?.role === 'manager' || notification.userId === user?.uid || notification.userId === 'all'
      ));
    }
  };

  const handleMarkAsRead = async (id: string) => {
    await firebaseService.markNotificationRead(id);
    loadNotifications();
  };

  const handleMarkAllAsRead = async () => {
    for (const notif of notifications.filter(n => !n.read)) {
      await firebaseService.markNotificationRead(notif.id);
    }
    loadNotifications();
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'schedule':
        return <Calendar size={18} />;
      case 'attendance':
        return <Clock size={18} />;
      case 'payroll':
        return <DollarSign size={18} />;
      case 'system':
        return <Settings size={18} />;
      default:
        return <Bell size={18} />;
    }
  };

  const getIconClass = (type: string) => {
    switch (type) {
      case 'schedule':
        return 'icon-schedule';
      case 'attendance':
        return 'icon-attendance';
      case 'payroll':
        return 'icon-payroll';
      case 'system':
        return 'icon-system';
      default:
        return 'icon-default';
    }
  };

  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.read)
    : notifications;

  const unreadCount = notifications.filter(n => !n.read).length;

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(hours / 24);

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
  };

  return (
    <div className="notifications-page">
      <div className="notifications-header">
        <div className="header-left">
          <h2>Notifications</h2>
          <p className="subtitle">Stay updated with your schedule</p>
        </div>
        {unreadCount > 0 && (
          <button className="mark-all-btn" onClick={handleMarkAllAsRead}>
            <CheckCheck size={18} />
            Mark all as read
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <Card className="filter-card">
        <div className="filter-tabs">
          <button 
            className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
            <span className="tab-count">{notifications.length}</span>
          </button>
          <button 
            className={`filter-tab ${filter === 'unread' ? 'active' : ''}`}
            onClick={() => setFilter('unread')}
          >
            Unread
            <span className="tab-count">{unreadCount}</span>
          </button>
        </div>
      </Card>

      {/* Notifications List */}
      <Card className="notifications-card">
        <CardContent>
          <div className="notifications-list">
            {filteredNotifications.length > 0 ? (
              filteredNotifications.map((notification) => (
                <div 
                  key={notification.id} 
                  className={`notification-item ${!notification.read ? 'unread' : ''}`}
                >
                  <div className={`notification-icon ${getIconClass(notification.type)}`}>
                    {getIcon(notification.type)}
                  </div>
                  <div className="notification-content">
                    <div className="notification-header">
                      <h4 className="notification-title">{notification.title}</h4>
                      <span className="notification-time">
                        {formatTime(notification.createdAt)}
                      </span>
                    </div>
                    <p className="notification-message">{notification.message}</p>
                    <span className={`notification-type type-${notification.type}`}>
                      {notification.type}
                    </span>
                  </div>
                  {!notification.read && (
                    <button 
                      className="mark-read-btn"
                      onClick={() => handleMarkAsRead(notification.id)}
                      title="Mark as read"
                    >
                      <Check size={16} />
                    </button>
                  )}
                </div>
              ))
            ) : (
              <div className="no-notifications">
                <Bell size={48} />
                <p>No notifications</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
