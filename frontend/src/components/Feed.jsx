import React, { useState, useEffect, useContext } from 'react';
import { postAPI, networkAPI } from '../api';
import { AuthContext } from '../AuthContext';
import PostCard from './PostCard';
import PostCreate from './PostCreate';
import '../styles/Feed.css';

const Feed = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [feedMode, setFeedMode] = useState('all');
  const { user } = useContext(AuthContext);

  const fetchFeed = async () => {
    // Only show loading state if we don't have posts yet (initial load)
    const isInitialLoad = posts.length === 0;
    if (isInitialLoad) setLoading(true);
    
    try {
      const res = feedMode === 'network'
        ? await networkAPI.getNetworkFeed()
        : await postAPI.getFeed();
      console.log('DEBUG FRONTEND: Total posts fetched:', res.data.length);
      if (res.data.length > 0) {
        console.log('DEBUG FRONTEND: Latest post data:', res.data[0]);
      }
      setPosts(res.data);
    } catch (err) {
      console.error('Error fetching feed:', err);
    }
    
    if (isInitialLoad) setLoading(false);
  };

  useEffect(() => {
    fetchFeed();
  }, [feedMode]);

  return (
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
      </div>
      <PostCreate onPostCreated={fetchFeed} />
      {loading ? (
        <p>Loading...</p>
      ) : posts.length === 0 && feedMode === 'network' ? (
        <p className="empty-feed">No posts from your network yet. Follow or connect with people first.</p>
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
    </div>
  );
};

export default Feed;
