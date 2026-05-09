import React, { useState, useContext } from 'react';
import { postAPI } from '../api';
import { AuthContext } from '../AuthContext';
import '../styles/PostCreate.css';

const PostCreate = ({ onPostCreated }) => {
  const [content, setContent] = useState('');
  const [media, setMedia] = useState([]); // [{ type: 'image', url: '...' }]
  const [showMediaInput, setShowMediaInput] = useState(false);
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState('image');
  const [loading, setLoading] = useState(false);
  const { user } = useContext(AuthContext);

  const handlePostSubmit = async (e) => {
    e.preventDefault();
    
    // Auto-add pending media URL if the user forgot to click "Add"
    let finalMedia = [...media];
    if (showMediaInput && mediaUrl.trim()) {
      finalMedia.push({ type: mediaType, url: mediaUrl.trim() });
    }

    if (!content.trim() && finalMedia.length === 0) return;

    setLoading(true);
    try {
      await postAPI.createPost(content, finalMedia);
      setContent('');
      setMedia([]);
      setMediaUrl('');
      setShowMediaInput(false);
      onPostCreated();
    } catch (err) {
      console.error('Error creating post:', err);
    }
    setLoading(false);
  };

  const addMedia = () => {
    if (!mediaUrl.trim()) return;
    setMedia([...media, { type: mediaType, url: mediaUrl }]);
    setMediaUrl('');
    setShowMediaInput(false);
  };

  const removeMedia = (index) => {
    setMedia(media.filter((_, i) => i !== index));
  };

  return (
    <div className="post-create">
      <div className="post-create-main">
        <img src={user?.profileImage} alt="profile" className="profile-image" />
        <div className="post-form-container">
          <textarea
            placeholder="Share your thoughts..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          
          {media.length > 0 && (
            <div className="media-previews">
              {media.map((item, index) => (
                <div key={index} className="media-preview-item">
                  {item.type === 'image' ? (
                    <img src={item.url} alt="preview" />
                  ) : (
                    <div className="video-preview-placeholder">📹 Video</div>
                  )}
                  <button type="button" className="remove-media-btn" onClick={() => removeMedia(index)}>×</button>
                </div>
              ))}
            </div>
          )}

          {showMediaInput && (
            <div className="media-input-bar">
              <input 
                type="text" 
                placeholder={`Enter ${mediaType} URL...`}
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                autoFocus
              />
              <div className="media-input-actions">
                <button type="button" onClick={addMedia}>Add</button>
                <button type="button" className="cancel-btn" onClick={() => setShowMediaInput(false)}>Cancel</button>
              </div>
            </div>
          )}

          <div className="post-create-footer">
            <div className="media-buttons">
              <button 
                type="button" 
                className="media-btn photo-btn"
                onClick={() => { setMediaType('image'); setShowMediaInput(true); }}
              >
                <span className="icon">🖼️</span> Photo
              </button>
              <button 
                type="button" 
                className="media-btn video-btn"
                onClick={() => { setMediaType('video'); setShowMediaInput(true); }}
              >
                <span className="icon">📹</span> Video
              </button>
              <button type="button" className="media-btn event-btn">
                <span className="icon">📅</span> Event
              </button>
            </div>
            <button 
              type="submit" 
              className="submit-post-btn"
              onClick={handlePostSubmit}
              disabled={loading || (!content.trim() && media.length === 0)}
            >
              {loading ? 'Posting...' : 'Post'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostCreate;
