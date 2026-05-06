import React, { useState, useContext } from 'react';
import { postAPI } from '../api';
import { AuthContext } from '../AuthContext';
import '../styles/PostCreate.css';

const PostCreate = ({ onPostCreated }) => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useContext(AuthContext);

  const handlePostSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);
    try {
      await postAPI.createPost(content, null);
      setContent('');
      onPostCreated();
    } catch (err) {
      console.error('Error creating post:', err);
    }
    setLoading(false);
  };

  return (
    <div className="post-create">
      <div className="post-create-header">
        <img src={user?.profileImage} alt="profile" className="profile-image" />
        <form onSubmit={handlePostSubmit} className="post-form">
          <textarea
            placeholder="Share your thoughts..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <button type="submit" disabled={loading || !content.trim()}>
            {loading ? 'Posting...' : 'Post'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PostCreate;
