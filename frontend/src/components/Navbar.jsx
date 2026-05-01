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
          <span className="user-name">{user?.name}</span>
          <button onClick={logout} className="logout-btn">
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
