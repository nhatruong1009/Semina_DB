import React, { useContext, useState, useEffect, useCallback } from 'react';
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

import JobDetailModal from './components/JobDetailModal';
import { jobAPI } from './api';
import { useSocket } from './socket';

function App() {
  const { accessToken, user } = useContext(AuthContext);
  const [currentPage, setCurrentPage] = useState('feed');
  const [targetUserId, setTargetUserId] = useState(null);
  const [targetPostId, setTargetPostId] = useState(null);
  const [jobToOpen, setJobToOpen] = useState(null);
  const [appliedIds, setAppliedIds] = useState(new Set());
  const [unreadCount, setUnreadCount] = useState(0);

  // Realtime: listen for incoming notifications via Socket.io
  const handleRealtimeNotification = useCallback(() => {
    setUnreadCount(prev => prev + 1);
  }, []);
  useSocket(user?.id, handleRealtimeNotification);

  // Fetch applied jobs globally to keep state in sync
  useEffect(() => {
    if (accessToken && user) {
      jobAPI.getApplied()
        .then(res => {
          const ids = new Set(res.data.map(j => j.id));
          setAppliedIds(ids);
        })
        .catch(() => {});
    }
  }, [accessToken, user]);

  const navigateToProfile = (userId) => {
    setTargetUserId(userId);
    setCurrentPage('profile');
  };

  const navigateToPost = (postId) => {
    setTargetPostId(postId);
    setCurrentPage('post');
  };

  const openJobDetail = async (jobOrId) => {
    if (typeof jobOrId === 'string') {
        try {
            const res = await jobAPI.getJobDetail(jobOrId);
            setJobToOpen(res.data);
        } catch (err) {
            console.error('Error fetching job for modal:', err);
        }
    } else {
        setJobToOpen(jobOrId);
    }
  };

  const handleGlobalApply = async (jobId) => {
    try {
      await jobAPI.applyJob(jobId);
      setAppliedIds(prev => new Set([...prev, jobId]));
    } catch (err) {
      console.error('Apply failed:', err);
    }
  };

  if (!accessToken) {
    return <Auth />;
  }

  return (
    <div className="app">
      <Navbar 
        currentPage={currentPage} 
        setCurrentPage={setCurrentPage} 
        navigateToProfile={navigateToProfile}
        unreadCount={unreadCount}
        onNotificationsOpen={() => setUnreadCount(0)}
      />
      <div className="main-content">
        {currentPage === 'feed' && (
            <Feed 
                navigateToProfile={navigateToProfile} 
                openJobDetail={openJobDetail}
                appliedIds={appliedIds}
                handleApply={handleGlobalApply}
            />
        )}
        {currentPage === 'network' && <Network navigateToProfile={navigateToProfile} />}
        {currentPage === 'jobs' && <Jobs navigateToProfile={navigateToProfile} />}
        {currentPage === 'admin-companies' && <AdminCompany />}
        {currentPage === 'profile' && <Profile userId={targetUserId} navigateToProfile={navigateToProfile} />}
        {currentPage === 'notifications' && (
            <Notifications 
                navigateToPost={navigateToPost} 
                navigateToProfile={navigateToProfile} 
                setCurrentPage={setCurrentPage}
                openJobDetail={openJobDetail}
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

      {jobToOpen && (
        <JobDetailModal 
            job={jobToOpen} 
            onClose={() => setJobToOpen(null)} 
            onApply={handleGlobalApply}
            isApplied={appliedIds.has(jobToOpen.id)}
            currentUserId={user?.id}
        />
      )}
    </div>
  );
}


export default App;
