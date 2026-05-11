import React, { useContext, useState } from 'react';
import { AuthContext } from './AuthContext';
import Auth from './components/Auth';
import Feed from './components/Feed';
import Network from './components/Network';
import Jobs from './components/Jobs';
import Navbar from './components/Navbar';
import AdminCompany from './components/AdminCompany';
import Profile from './components/Profile';
import Notifications from './components/Notifications';
import PostDetail from './components/PostDetail';
import './App.css';

function App() {
  const { accessToken } = useContext(AuthContext);
  const [currentPage, setCurrentPage] = useState('feed');
  const [targetUserId, setTargetUserId] = useState(null);
  const [targetPostId, setTargetPostId] = useState(null);

  if (!accessToken) {
    return <Auth />;
  }

  const navigateToProfile = (userId) => {
    setTargetUserId(userId);
    setCurrentPage('profile');
  };

  const navigateToPost = (postId) => {
    setTargetPostId(postId);
    setCurrentPage('post');
  };

  return (
    <div className="app">
      <Navbar 
        currentPage={currentPage} 
        setCurrentPage={setCurrentPage} 
        navigateToProfile={navigateToProfile}
      />
      <div className="main-content">
        {currentPage === 'feed' && <Feed navigateToProfile={navigateToProfile} />}
        {currentPage === 'network' && <Network navigateToProfile={navigateToProfile} />}
        {currentPage === 'jobs' && <Jobs />}
        {currentPage === 'admin-companies' && <AdminCompany />}
        {currentPage === 'profile' && <Profile userId={targetUserId} navigateToProfile={navigateToProfile} />}
        {currentPage === 'notifications' && (
            <Notifications 
                navigateToPost={navigateToPost} 
                navigateToProfile={navigateToProfile} 
            />
        )}
        {currentPage === 'post' && (
            <PostDetail 
                postId={targetPostId} 
                navigateToProfile={navigateToProfile} 
                onBack={() => setCurrentPage('notifications')}
            />
        )}
      </div>
    </div>
  );
}


export default App;
