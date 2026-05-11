import React, { useState, useEffect } from 'react';
import { notificationAPI } from '../api';
import '../styles/Notifications.css';

const Notifications = ({ navigateToPost, navigateToProfile }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data } = await notificationAPI.getNotifications();
      setNotifications(data);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleNotifClick = async (notif) => {
    // 1. Mark as read if unread
    if (!notif.is_read) {
      try {
        await notificationAPI.markAsRead(notif._id);
        setNotifications(prev => 
          prev.map(n => n._id === notif._id ? { ...n, is_read: true } : n)
        );
      } catch (err) {
        console.error('Error marking as read:', err);
      }
    }

    // 2. Navigate based on type
    const entity = notif.entity || notif.target;
    const actorId = (notif.actors && notif.actors.length > 0) ? notif.actors[0].id : (notif.actor?.id);

    if (entity) {
      if (['POST_LIKE', 'POST_COMMENT', 'POST_SHARE'].includes(notif.type)) {
        navigateToPost(entity.id);
      } else if (['USER_FOLLOW', 'CONNECTION_REQUEST', 'CONNECTION_ACCEPT'].includes(notif.type)) {
        navigateToProfile(entity.id);
      }
    } else if (actorId) {
        navigateToProfile(actorId);
    }
  };

  const handleMarkAllAsRead = async (e) => {
    e.stopPropagation(); // Prevent navigation
    try {
      await notificationAPI.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 0) return 'Just now';
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const getActionText = (type) => {
    switch (type) {
      case 'POST_LIKE': return 'liked your post';
      case 'POST_COMMENT': return 'commented on your post';
      case 'POST_SHARE': return 'shared your post';
      case 'USER_FOLLOW': return 'started following you';
      case 'CONNECTION_REQUEST': return 'sent you a connection request';
      case 'CONNECTION_ACCEPT': return 'accepted your connection request';
      case 'JOB_RECOMMENDATION': return 'recommended a job for you';
      case 'COMPANY_HIRING': return 'is hiring';
      default: return 'interacted with you';
    }
  };

  const getActionIcon = (type) => {
    switch (type) {
      case 'POST_LIKE': return '❤️';
      case 'POST_COMMENT': return '💬';
      case 'POST_SHARE': return '🔗';
      case 'USER_FOLLOW': return '👤';
      case 'CONNECTION_REQUEST': return '➕';
      case 'CONNECTION_ACCEPT': return '✅';
      default: return '🔔';
    }
  };

  if (loading) return (
    <div className="notifications-container loading">
        <div className="loader"></div>
        <p>Fetching your updates...</p>
    </div>
  );

  return (
    <div className="notifications-page-wrapper">
      <div className="notifications-container glass">
        <div className="notifications-header">
          <div className="header-left">
            <h2>Notifications</h2>
            <span className="notif-count">{notifications.filter(n => !n.is_read).length} unread</span>
          </div>
          <button 
            className="mark-all-read-btn" 
            onClick={handleMarkAllAsRead}
            disabled={!notifications.some(n => !n.is_read)}
          >
            Mark all as read
          </button>
        </div>

        {notifications.length === 0 ? (
          <div className="no-notifications">
            <div className="empty-icon">📭</div>
            <h3>All caught up!</h3>
            <p>You have no new notifications at the moment.</p>
          </div>
        ) : (
          <div className="notifications-list">
            {notifications.map((notif) => {
              const actors = notif.actors || [];
              const count = notif.count || (notif.actor ? 1 : 0);
              const latestActor = actors.length > 0 ? actors[actors.length - 1] : (notif.actor || {});
              const entity = notif.entity || notif.target || {};

              return (
                <div 
                  key={notif._id} 
                  className={`notification-item ${!notif.is_read ? 'unread' : ''}`}
                  onClick={() => handleNotifClick(notif)}
                >
                  <div className="avatar-wrapper">
                      <img 
                          src={latestActor.avatar || 'https://ui-avatars.com/api/?name=User&background=0a66c2&color=fff'} 
                          alt="actor" 
                          className="notification-avatar" 
                      />
                      <span className="action-badge">{getActionIcon(notif.type)}</span>
                  </div>
                  <div className="notification-content">
                    <div className="notification-text">
                      <span className="actor-name">
                          {actors.length > 0 ? (
                              <>
                                  {count === 1 && actors[0].name}
                                  {count === 2 && actors.length >= 2 && `${actors[0].name} and ${actors[1].name}`}
                                  {count === 3 && actors.length >= 3 && `${actors[0].name}, ${actors[1].name}, and ${actors[2].name}`}
                                  {count > 3 && `${actors[0].name}, ${actors[1].name}, and ${count - 2} others`}
                              </>
                          ) : (notif.actor?.name || 'Someone')}
                      </span>
                      <span className="action-desc"> {getActionText(notif.type)}</span>
                    </div>
                    {entity.preview && (
                      <div className="notification-preview">
                          <span className="quote-icon">“</span>
                          {entity.preview}
                          <span className="quote-icon">”</span>
                      </div>
                    )}
                    <div className="notification-footer">
                      <span className="notification-time">{formatTime(notif.updated_at || notif.created_at)}</span>
                      {!notif.is_read && <span className="unread-dot"></span>}
                    </div>
                  </div>
                  <div className="notif-action-indicator">
                      <span className="arrow">›</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
