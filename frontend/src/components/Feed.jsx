import React, { useState, useEffect, useContext, useCallback } from 'react';
import { postAPI, networkAPI } from '../api';
import { AuthContext } from '../AuthContext';
import PostCard from './PostCard';
import PostCreate from './PostCreate';
import JobCard from './JobCard';
import '../styles/Feed.css';

const JobEmptyState = ({ onRetry }) => (
  <div className="jobs-empty-state">
    <div className="empty-state-icon">🔍</div>
    <h3>No jobs available right now</h3>
    <p>We'll notify you when new opportunities matching your profile appear.</p>
    <button className="retry-btn" onClick={onRetry}>Refresh</button>
  </div>
);

const JobLoadingSkeleton = () => (
  <div className="jobs-skeleton">
    {[1, 2, 3].map(i => (
      <div key={i} className="skeleton-card">
        <div className="skeleton-line w-60" />
        <div className="skeleton-line w-40" />
        <div className="skeleton-line w-80" />
      </div>
    ))}
  </div>
);

const Feed = ({ navigateToProfile, openJobDetail, appliedIds, handleApply }) => {
  const { user } = useContext(AuthContext);

  // Post state
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [feedMode, setFeedMode] = useState('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Job state
  const [jobs, setJobs] = useState([]);
  const [jobPage, setJobPage] = useState(1);
  const [jobHasMore, setJobHasMore] = useState(false);
  const [jobLoadingMore, setJobLoadingMore] = useState(false);
  const [jobLoading, setJobLoading] = useState(false);
  const [totalJobs, setTotalJobs] = useState(0);

  // Sidebar
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
      if (isInitial) {
        setPosts(newPosts);
      } else {
        setPosts(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          return [...prev, ...newPosts.filter(p => !existingIds.has(p.id))];
        });
      }
      setHasMore(newPosts.length === limit);
      setPage(isInitial ? 2 : prev => prev + 1);
    } catch (err) {
      console.error('Error fetching feed:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const fetchJobs = useCallback(async (isInitial = false) => {
    if (!user?.id) return;
    const targetPage = isInitial ? 1 : jobPage;
    if (isInitial) {
      setJobLoading(true);
      setJobPage(1);
      setJobs([]);
    } else {
      setJobLoadingMore(true);
    }
    try {
      const res = await networkAPI.getJobRecommendations(String(user.id), targetPage, 10);
      const data = res.data;
      // Support both old array format and new paginated format
      const newJobs = Array.isArray(data) ? data : (data.jobs || []);
      const hasMoreJobs = Array.isArray(data) ? false : (data.hasMore ?? false);
      const total = Array.isArray(data) ? newJobs.length : (data.total ?? newJobs.length);

      if (isInitial) {
        setJobs(newJobs);
      } else {
        setJobs(prev => {
          const existingIds = new Set(prev.map(j => j.id));
          return [...prev, ...newJobs.filter(j => !existingIds.has(j.id))];
        });
      }
      setJobHasMore(hasMoreJobs);
      setTotalJobs(total);
      if (!isInitial) setJobPage(prev => prev + 1);
    } catch (err) {
      console.error('Error fetching jobs:', err);
    } finally {
      setJobLoading(false);
      setJobLoadingMore(false);
    }
  }, [user?.id, jobPage]);

  useEffect(() => {
    if (feedMode === 'jobs') {
      fetchJobs(true);
    } else {
      fetchFeed(true);
      // Sidebar recommendations (page 1, limit 5)
      if (user?.id) {
        networkAPI.getJobRecommendations(String(user.id), 1, 5)
          .then(res => {
            const data = res.data;
            const recs = Array.isArray(data) ? data : (data.jobs || []);
            setRecommendations(recs);
          })
          .catch(() => {});
      }
    }
  }, [feedMode, user?.id]);

  return (
    <div className="feed-layout">
      <div className="feed-container">
        <div className="feed-toggle">
          <button className={feedMode === 'all' ? 'active' : ''} onClick={() => setFeedMode('all')}>All Posts</button>
          <button className={feedMode === 'network' ? 'active' : ''} onClick={() => setFeedMode('network')}>Network Feed</button>
          <button className={feedMode === 'jobs' ? 'active' : ''} onClick={() => setFeedMode('jobs')}>🎯 Find Jobs</button>
        </div>

        {feedMode === 'jobs' ? (
          <div className="jobs-feed animate-in">
            <div className="section-header">
              <h2>Jobs You Might Like</h2>
              <p className="subtitle">
                {totalJobs > 0 ? `${totalJobs} opportunities available` : 'Based on your profile and skills'}
              </p>
            </div>
            {jobLoading ? (
              <JobLoadingSkeleton />
            ) : jobs.length > 0 ? (
              <>
                {jobs.map(job => (
                  <JobCard
                    key={job.id}
                    job={job}
                    onApply={handleApply}
                    isApplied={appliedIds.has(job.id)}
                    onViewDetails={openJobDetail}
                    currentUserId={user?.id}
                  />
                ))}
                {jobHasMore && (
                  <div className="load-more-container">
                    <button
                      className="load-more-btn"
                      onClick={() => fetchJobs(false)}
                      disabled={jobLoadingMore}
                    >
                      {jobLoadingMore ? 'Loading more...' : 'Load More Jobs'}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <JobEmptyState onRetry={() => fetchJobs(true)} />
            )}
          </div>
        ) : (
          <>
            <PostCreate onPostCreated={() => fetchFeed(true)} />
            {loading ? (
              <p className="loading-msg">Loading...</p>
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
              </div>
            )}
          </>
        )}
      </div>

      <div className="feed-sidebar">
        {recommendations.length > 0 && (
          <div className="jobs-widget animate-in">
            <h3>Jobs for you</h3>
            <div className="widget-list">
              {recommendations.map((job, i) => (
                <div key={i} className="widget-item">
                  <div className="job-info-mini">
                    <p className="job-title">{job.title}</p>
                    <p className="job-company">{job.company_name}</p>
                    {job.matching_skills > 0 && (
                      <p className="job-match">✨ {job.matching_skills} matching skills</p>
                    )}
                  </div>
                  <button className="view-job-btn" onClick={() => openJobDetail(job)}>View</button>
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
