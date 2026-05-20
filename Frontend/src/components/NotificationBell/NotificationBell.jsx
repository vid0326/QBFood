import { useState, useEffect, useRef, useContext } from 'react';
import axios from 'axios';
import { StoreContext } from '../../context/StoreContext';
import styles from './NotificationBell.module.css';

const NotificationBell = () => {
  const { URl, token } = useContext(StoreContext);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await axios.get(URl + '/api/notifications', { headers: { token } });
      if (res.data.success) {
        setNotifications(res.data.data);
        setUnread(res.data.unreadCount);
      }
    } catch (e) { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    const handleOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const markAllRead = async () => {
    try {
      await axios.post(URl + '/api/notifications/mark-read', {}, { headers: { token } });
      setUnread(0);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (e) { /* silent */ }
  };

  const handleOpen = () => {
    setOpen(o => !o);
    if (!open && unread > 0) markAllRead();
  };

  const typeIcon = { order: '📦', delivery: '🛵', promo: '🏷️', info: 'ℹ️' };
  const timeAgo = (date) => {
    const diff = Math.floor((Date.now() - new Date(date)) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
    return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  if (!token) return null;

  return (
    <div className={styles.wrapper} ref={dropdownRef}>
      <button className={styles.bell} onClick={handleOpen} aria-label="Notifications">
        🔔
        {unread > 0 && <span className={styles.badge}>{unread > 9 ? '9+' : unread}</span>}
      </button>

      {open && (
        <div className={styles.dropdown}>
          <div className={styles.header}>
            <span>Notifications</span>
            {unread > 0 && <button className={styles.markRead} onClick={markAllRead}>Mark all read</button>}
          </div>
          <div className={styles.list}>
            {loading ? (
              <div className={styles.empty}>Loading...</div>
            ) : notifications.length === 0 ? (
              <div className={styles.empty}>🎉 You're all caught up!</div>
            ) : notifications.map(n => (
              <div key={n._id} className={`${styles.item} ${!n.read ? styles.unreadItem : ''}`}>
                <span className={styles.itemIcon}>{typeIcon[n.type] || '🔔'}</span>
                <div className={styles.itemBody}>
                  <p className={styles.itemTitle}>{n.title}</p>
                  <p className={styles.itemMsg}>{n.message}</p>
                  <p className={styles.itemTime}>{timeAgo(n.createdAt)}</p>
                </div>
                {!n.read && <span className={styles.dot} />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
