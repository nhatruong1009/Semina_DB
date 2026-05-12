import React, { useContext } from 'react';
import { AuthContext } from '../AuthContext';
import '../styles/Navbar.css';

const Navbar = ({ currentPage, setCurrentPage, navigateToProfile, unreadCount = 0, onNotificationsOpen }) => {
  const { logout, user } = useContext(AuthContext);
  // unreadCount is now fully managed by App.jsx:
  // • Initial value = fetched from DB on login (notificationAPI.getUnreadCount)
  // • Incremented by socket events (useSocket in App.jsx)
  // • Reset to 0 when user opens the Notifications page (onNotificationsOpen)
  // Navbar is a pure display component for the badge — no local polling needed.

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavClick = (page) => {
    if (currentPage === page) {
      scrollToTop();
    } else {
      setCurrentPage(page);
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-left">
            <div className="navbar-logo" onClick={() => handleNavClick('feed')}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="34" height="34" fill="#0a66c2">
                <path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 118.25 6.5 1.75 1.75 0 016.5 8.25zM19 19h-3v-4.74c0-1.42-.6-1.93-1.38-1.93A1.74 1.74 0 0013 14.19V19h-3v-9h2.9v1.3a3.11 3.11 0 012.7-1.4c1.55 0 3.36.86 3.36 3.66z"></path>
              </svg>
            </div>
        </div>

        <div className="nav-links">
          <button
            className={`nav-item ${currentPage === 'feed' ? 'active' : ''}`}
            onClick={() => handleNavClick('feed')}
          >
            <div className="nav-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                    <path d="M23 9v2h-2v7a3 3 0 01-3 3h-4v-6h-4v6H6a3 3 0 01-3-3v-7H1V9l11-7z"></path>
                </svg>
            </div>
            <span>Home</span>
          </button>

          <button
            className={`nav-item ${currentPage === 'network' ? 'active' : ''}`}
            onClick={() => handleNavClick('network')}
          >
            <div className="nav-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                    <path d="M12 16a4 4 0 114-4 4 4 0 01-4 4zm7-4a7 7 0 10-7 7 7 7 0 007-7zm2-10v2h-2a11 11 0 00-11 11v2H9v-2a13 13 0 0113-13z"></path>
                    <path d="M16 1a3 3 0 11-3 3 3 3 0 013-3zm0 4.5a1.5 1.5 0 10-1.5-1.5 1.5 1.5 0 001.5 1.5z"></path>
                </svg>
            </div>
            <span>Network</span>
          </button>

          <button
            className={`nav-item ${currentPage === 'notifications' ? 'active' : ''}`}
            onClick={() => {
              if (currentPage === 'notifications') {
                scrollToTop();
              } else {
                setCurrentPage('notifications');
              }
            }}
          >
            <div className="nav-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                    <path d="M22 19h-8.28a2 2 0 11-3.44 0H2v-2l1-4V8a9 9 0 1118 0v5l1 4z"></path>
                </svg>
                {unreadCount > 0 && (
                  <span className="nav-badge">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
            </div>
            <span>Notifications</span>
          </button>

          {user?.is_staff === true && (
            <button
              className={`nav-item ${currentPage === 'jobs' ? 'active' : ''}`}
              onClick={() => handleNavClick('jobs')}
            >
                <div className="nav-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                        <path d="M17 6V5a3 3 0 00-3-3h-4a3 3 0 00-3 3v1H2v15h20V6zM9 5a1 1 0 011-1h4a1 1 0 011 1v1H9z"></path>
                    </svg>
                </div>
              <span>Jobs</span>
            </button>
          )}
          {user?.is_superadmin === true && (
            <button
              className={`nav-item ${currentPage === 'admin-companies' ? 'active' : ''}`}
              onClick={() => handleNavClick('admin-companies')}
            >
                <div className="nav-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                        <path d="M17 6V5a3 3 0 00-3-3h-4a3 3 0 00-3 3v1H2v15h20V6zM9 5a1 1 0 011-1h4a1 1 0 011 1v1H9z"></path>
                    </svg>
                </div>
              <span>Admin Companies</span>
            </button>
          )}

        </div>

        <div className="navbar-right">
          <div className="navbar-user" onClick={() => navigateToProfile(user.id)}>
            <img 
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.full_name || 'User')}&background=0a66c2&color=fff`} 
              alt="me" 
              className="nav-profile-img" 
            />
            <div className="user-info">
                <span className="user-name">Me</span>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
                    <path d="M8 11L3 6h10z"></path>
                </svg>
            </div>
          </div>
          <div className="divider"></div>
          <button onClick={logout} className="nav-logout-link">
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
