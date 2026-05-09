import React, { useState, useEffect, useContext } from 'react';
import { postAPI } from '../api';
import { AuthContext } from '../AuthContext';
import PostCard from './PostCard';
import PostCreate from './PostCreate';
import '../styles/Feed.css';

const Feed = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useContext(AuthContext);

  const fetchFeed = async () => {
    // Only show loading state if we don't have posts yet (initial load)
    const isInitialLoad = posts.length === 0;
    if (isInitialLoad) setLoading(true);
    
    try {
      const res = await postAPI.getFeed();
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
  }, []);

  return (
    <div className="feed-container">
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
    </div>
  );
};

export default Feed;
