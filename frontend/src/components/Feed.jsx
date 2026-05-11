import React, { useState, useEffect, useContext } from 'react';
import { postAPI, networkAPI, jobAPI } from '../api';
import { AuthContext } from '../AuthContext';
import PostCard from './PostCard';
import PostCreate from './PostCreate';
import JobCard from './JobCard';
import '../styles/Feed.css';

const Feed = ({ navigateToProfile }) => {
  const [posts, setPosts] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [appliedIds, setAppliedIds] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [feedMode, setFeedMode] = useState('all'); // 'all', 'network', 'jobs'
  const { user } = useContext(AuthContext);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [recommendations, setRecommendations] = useState([]);

  const fetchFeed = async (isInitial = false) => {
    if (isInitial) {
      setLoading(true);
      setPage(1);
      setHasMore(true);
    } else {
      setLoadingMore(true);
    }
    
    const targetPage = isInitial ? 1 : page;
    const limit = 10;

    try {
      const res = feedMode === 'network'
        ? await networkAPI.getNetworkFeed(targetPage, limit)
        : await postAPI.getFeed(targetPage, limit);
      
      const newPosts = res.data || [];
      console.log(`[Feed] Fetched ${newPosts.length} posts for mode: ${feedMode}, page: ${targetPage}`);
      
      if (isInitial) {
        setPosts(newPosts);
      } else {
        // Prevent duplicates
        setPosts(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const filtered = newPosts.filter(p => !existingIds.has(p.id));
          return [...prev, ...filtered];
        });
      }

      setHasMore(newPosts.length === limit);
      if (!isInitial && newPosts.length > 0) {
        setPage(prev => prev + 1);
      } else if (isInitial && newPosts.length > 0) {
        setPage(2);
      }

    } catch (err) {
      console.error('Error fetching feed:', err);
    } finally {
      if (isInitial) setLoading(false);
      setLoadingMore(false);
    }
  };

  const fetchJobs = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [jobRes, appliedRes] = await Promise.all([
        networkAPI.getJobRecommendations(String(user.id)),
        jobAPI.getApplied(),
      ]);
      setJobs(jobRes.data);
      setRecommendations(jobRes.data.slice(0, 3));
      setAppliedIds(new Set(appliedRes.data.map(j => j.id)));
    } catch (err) {
      console.error('Error fetching jobs:', err);
    }
    setLoading(false);
  };

  const handleApply = async (jobId) => {
    try {
      await jobAPI.applyJob(jobId);
      setAppliedIds(prev => new Set([...prev, jobId]));
      fetchJobs();
    } catch (err) {
      console.error('Apply failed:', err);
    }
  };

  useEffect(() => {
    if (feedMode === 'jobs') {
      fetchJobs();
    } else {
      fetchFeed(true);
      if (user?.id) fetchJobs();
    }
  }, [feedMode, user?.id]);

  return (
    <div className="feed-layout">
      <div className="feed-container">
        <div className="feed-toggle">
          <button
            className={feedMode === 'all' ? 'active' : ''}
            onClick={() => setFeedMode('all')}
          >
            All Posts
          </button>
          <button
            className={feedMode === 'network' ? 'active' : ''}
            onClick={() => setFeedMode('network')}
          >
            Network Feed
          </button>
          <button
            className={feedMode === 'jobs' ? 'active' : ''}
            onClick={() => setFeedMode('jobs')}
          >
            🎯 Find Jobs
          </button>
        </div>

        {feedMode === 'jobs' ? (
          <div className="jobs-feed animate-in">
            <div className="section-header">
              <h2>Recommended Jobs</h2>
            </div>
            {loading ? (
              <p className="loading-msg">Loading jobs...</p>
            ) : jobs.length > 0 ? (
              jobs.map(job => (
                <JobCard 
                  key={job.id} 
                  job={job} 
                  onApply={handleApply} 
                  isApplied={appliedIds.has(job.id)}
                />
              ))
            ) : (
              <p className="empty-msg">No jobs available right now.</p>
            )}
          </div>
        ) : (
          <>
            <PostCreate onPostCreated={() => fetchFeed(true)} />
            {loading ? (
              <p className="loading-msg">Initial loading...</p>
            ) : (
              <div className="posts-list">
                {posts.map((post, index) => {
                  if (!post || !post.id) return null;
                  return (
                    <PostCard 
                      key={post.id || index} 
                      post={post} 
                      onUpdate={() => fetchFeed(true)} 
                      navigateToProfile={navigateToProfile}
                    />
                  );
                })}
                
                {hasMore && (
                  <div className="load-more-container">
                    <button 
                      className="load-more-btn" 
                      onClick={() => fetchFeed(false)}
                      disabled={loadingMore}
                    >
                      {loadingMore ? 'Loading more...' : 'Load More Posts'}
                    </button>
                  </div>
                )}
                
                {!hasMore && posts.length > 0 && (
                  <p className="end-msg">You've reached the end of the feed.</p>
                )}
                
                {!loading && posts.length === 0 && (
                  <p className="empty-msg">No posts found.</p>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <div className="feed-sidebar">
        {recommendations.length > 0 && (
          <div className="jobs-widget">
            <h3>Jobs for you</h3>
            <div className="widget-list">
              {recommendations.map((job, i) => (
                <div key={i} className="widget-item">
                  <p className="job-title">{job.job}</p>
                  <p className="job-meta">{job.matching_skills} matching skills</p>
                  <button className="view-job-btn" onClick={() => setFeedMode('jobs')}>View</button>
                </div>
              ))}
            </div>
            <button className="see-all-jobs" onClick={() => setFeedMode('jobs')}>
              See all jobs
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Feed;
