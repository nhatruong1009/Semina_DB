import React, { useState, useEffect } from 'react';
import { postAPI } from '../api';
import PostCard from './PostCard';
import '../styles/Notifications.css';

const PostDetail = ({ postId, navigateToProfile, onBack }) => {
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        setLoading(true);
        console.log(`Fetching post: ${postId}`);
        const { data } = await postAPI.getPostById(postId);
        console.log('Post data received:', data);
        if (!data || data.error) {
            setError('Post not found.');
        } else {
            setPost(data);
        }
      } catch (err) {
        console.error('Error fetching post:', err);
        setError('Post not found or has been deleted.');
      } finally {
        setLoading(false);
      }
    };

    if (postId) fetchPost();
  }, [postId]);

  if (loading) return (
    <div className="PostDetail-wrapper loading-state">
        <div className="spinner"></div>
        <p>Loading post details...</p>
    </div>
  );

  if (error) return (
    <div className="PostDetail-wrapper">
        <div className="error-card glass">
            <div className="error-icon">⚠️</div>
            <h3>Oops!</h3>
            <p>{error}</p>
            <button onClick={onBack} className="back-btn-premium">
                <span className="icon">←</span> Back to Notifications
            </button>
        </div>
    </div>
  );

  return (
    <div className="PostDetail-wrapper animate-in">
      <div className="detail-header-premium">
          <button onClick={onBack} className="back-circle-btn" title="Go back">
              <span className="icon">←</span>
          </button>
          <div className="header-info">
              <h2>Post Insight</h2>
              <span className="subtitle">View details and interactions</span>
          </div>
      </div>
      {post && (
        <div className="post-card-container">
            <PostCard 
              post={post} 
              onUpdate={() => {}} 
              navigateToProfile={navigateToProfile} 
            />
        </div>
      )}
    </div>
  );
};

export default PostDetail;
