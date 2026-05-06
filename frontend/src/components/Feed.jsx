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
    setLoading(true);
    try {
      const res = await postAPI.getFeed();
      setPosts(res.data);
    } catch (err) {
      console.error('Error fetching feed:', err);
    }
    setLoading(false);
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
          {posts.map((post) => (
            <PostCard key={post.id} post={post} onUpdate={fetchFeed} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Feed;
