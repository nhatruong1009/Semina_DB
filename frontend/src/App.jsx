import React, { useContext, useState } from 'react';
import { AuthContext } from './AuthContext';
import Auth from './components/Auth';
import Feed from './components/Feed';
import Network from './components/Network';
import Jobs from './components/Jobs';
import Navbar from './components/Navbar';
import './App.css';

function App() {
  const { accessToken } = useContext(AuthContext);
  const [currentPage, setCurrentPage] = useState('feed');

  if (!accessToken) {
    return <Auth />;
  }

  return (
    <div className="app">
      <Navbar currentPage={currentPage} setCurrentPage={setCurrentPage} />
      <div className="main-content">
        {currentPage === 'feed' && <Feed />}
        {currentPage === 'network' && <Network />}
        {currentPage === 'jobs' && <Jobs />}
      </div>
    </div>
  );
}

export default App;
