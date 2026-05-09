import React, { useState, useEffect, useContext } from 'react';
import { postAPI, jobAPI, networkAPI } from '../api';
import { AuthContext } from '../AuthContext';
import PostCard from './PostCard';
import JobCard from './JobCard';
import PostCreate from './PostCreate';
import '../styles/Feed.css';

const Feed = () => {
  const [posts, setPosts] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [activeTab, setActiveTab] = useState('posts'); // 'posts', 'network', or 'jobs'
  const [loading, setLoading] = useState(false);
  const { user } = useContext(AuthContext);

  const fetchFeed = async (mode) => {
    const isInitialLoad = posts.length === 0;
    if (isInitialLoad) setLoading(true);
    try {
      const res = mode === 'network'
        ? await networkAPI.getNetworkFeed()
        : await postAPI.getFeed();
      setPosts(res.data);
    } catch (err) {
      console.error('Error fetching feed:', err);
    }
    if (isInitialLoad) setLoading(false);
  };

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await jobAPI.getJobs();
      setJobs(res.data);
    } catch (err) {
      console.error('Error fetching jobs:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (activeTab === 'posts' || activeTab === 'network') {
      fetchFeed(activeTab);
    } else if (activeTab === 'jobs') {
      fetchJobs();
    }
  }, [activeTab]);

  return (
    <div className="feed-container">
      {/* 1. Feed Toggle on top */}
      <div className="feed-toggle" style={{ marginBottom: '12px' }}>
        <button
          className={`toggle-btn ${activeTab === 'posts' ? 'active' : ''}`}
          onClick={() => setActiveTab('posts')}
        >
          All Posts
        </button>
        <button
          className={`toggle-btn ${activeTab === 'network' ? 'active' : ''}`}
          onClick={() => setActiveTab('network')}
        >
          Network Posts
        </button>
        <button
          className={`toggle-btn ${activeTab === 'jobs' ? 'active' : ''}`}
          onClick={() => setActiveTab('jobs')}
        >
          Jobs
        </button>
      </div>

      {/* 2. Post Create (Only show for post/network tabs) */}
      {(activeTab === 'posts' || activeTab === 'network') && (
        <PostCreate onPostCreated={() => fetchFeed(activeTab)} />
      )}

      {/* 3. List Content */}
      {loading ? (
        <div className="loading-container">
          <p>Loading {activeTab}...</p>
        </div>
      ) : (
        <div className="posts-list">
          {activeTab === 'jobs' ? (
            jobs.length > 0 ? (
              jobs.map((job, index) => (
                <JobCard key={job.id || index} job={job} />
              ))
            ) : (
              <p className="empty-msg">No jobs available.</p>
            )
          ) : (
            posts.length > 0 ? (
              posts.map((post, index) => {
                if (!post || !post.id) return null;
                return (
                  <PostCard
                    key={post.id || index}
                    post={post}
                    onUpdate={() => fetchFeed(activeTab)}
                  />
                );
              })
            ) : (
              <p className="empty-msg">
                {activeTab === 'network'
                  ? "No posts from your network. Connect with more people!"
                  : "No posts yet."}
              </p>
            )
          )}
        </div>
      )}
    </div>
  );
};

export default Feed;
