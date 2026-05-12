import React, { useContext, useState, useEffect, useCallback } from 'react';
import { notificationAPI } from './api';
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

  // FETCH INITIAL UNREAD COUNT from DB on login.
  // Root-cause fix: Navbar's polling guard (externalCount !== undefined) was
  // always true because App passed 0 (not undefined), so Navbar never called
  // the API. Moving the fetch here makes App the single source of truth.
  useEffect(() => {
    if (accessToken && user) {
      notificationAPI.getUnreadCount()
        .then(res => setUnreadCount(res.data.unread_count || 0))
        .catch(() => {}); // fail silently — badge stays 0, not a critical error
    }
  }, [accessToken, user]);

  // Realtime: listen for incoming notifications via Socket.io.
  // Increments on top of the initial DB count fetched above.
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

  const navigateToProfile = useCallback((userId) => {
    setTargetUserId(userId);
    setCurrentPage('profile');
  }, []);

  const navigateToPost = useCallback((postId) => {
    setTargetPostId(postId);
    setCurrentPage('post');
  }, []);

  const openJobDetail = useCallback(async (jobOrId) => {
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
  }, []);

  const handleGlobalApply = useCallback(async (jobId) => {
    try {
      await jobAPI.applyJob(jobId);
      setAppliedIds(prev => new Set([...prev, jobId]));
    } catch (err) {
      console.error('Apply failed:', err);
    }
  }, []);

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
                setUnreadCount={setUnreadCount}
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
