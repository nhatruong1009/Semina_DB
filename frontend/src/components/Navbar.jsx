import React, { useContext } from 'react';
import { AuthContext } from '../AuthContext';
import '../styles/Navbar.css';

const Navbar = ({ currentPage, setCurrentPage }) => {
  const { logout, user } = useContext(AuthContext);

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-logo">
          <h1>in</h1>
        </div>
        <div className="nav-links">
          <button
            className={currentPage === 'feed' ? 'active' : ''}
            onClick={() => setCurrentPage('feed')}
          >
            Home
          </button>
          <button
            className={currentPage === 'network' ? 'active' : ''}
            onClick={() => setCurrentPage('network')}
          >
            Network
          </button>
          <button
            className={currentPage === 'jobs' ? 'active' : ''}
            onClick={() => setCurrentPage('jobs')}
          >
            Jobs
          </button>
        </div>
        <div className="navbar-right">
          <div className="navbar-user">
            <img 
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.full_name || 'User')}&background=0a66c2&color=fff`} 
              alt="me" 
              className="nav-profile-img" 
            />
            <span className="user-name">{user?.full_name || 'User'}</span>
          </div>
          <button onClick={logout} className="logout-btn">
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
