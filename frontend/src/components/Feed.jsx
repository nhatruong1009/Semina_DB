import React, { useState, useEffect, useContext } from 'react';
import { postAPI, networkAPI, jobAPI } from '../api';
import { AuthContext } from '../AuthContext';
import PostCard from './PostCard';
import PostCreate from './PostCreate';
import JobCard from './JobCard';
import '../styles/Feed.css';

const Feed = () => {
  const [posts, setPosts] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [appliedIds, setAppliedIds] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [feedMode, setFeedMode] = useState('all'); // 'all', 'network', 'jobs'
  const { user } = useContext(AuthContext);

  const [recommendations, setRecommendations] = useState([]);

  const fetchFeed = async () => {
    const isInitialLoad = posts.length === 0;
    if (isInitialLoad) setLoading(true);
    
    try {
      const res = feedMode === 'network'
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
      
      const appliedRes = await jobAPI.getApplied();
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

  const fetchJobRecs = async () => {
    if (!user?.id) return;
    try {
      const res = await networkAPI.getJobRecommendations(String(user.id));
      setRecommendations(res.data.slice(0, 3)); // Top 3
    } catch (err) {}
  };

  useEffect(() => {
    if (feedMode === 'jobs') {
      fetchJobs();
    } else {
      fetchFeed();
    }
    fetchJobRecs();
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
              <p>Loading jobs...</p>
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
            <PostCreate onPostCreated={fetchFeed} />
            {loading ? (
              <p>Loading...</p>
            ) : (
              <div className="posts-list">
                {posts.map((post, index) => {
                  if (!post || !post.id) return null;
                  return (
                    <PostCard 
                      key={post.id || index} 
                      post={post} 
                      onUpdate={fetchFeed} 
                    />
                  );
                })}
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
