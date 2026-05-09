import React, { useState, useContext, useRef } from 'react';
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
  const [uploading, setUploading] = useState(false);
  const { user } = useContext(AuthContext);
  const fileInputRef = useRef(null);

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

  const addMediaUrl = () => {
    if (!mediaUrl.trim()) return;
    setMedia([...media, { type: mediaType, url: mediaUrl.trim() }]);
    setMediaUrl('');
    setShowMediaInput(false);
  };

  const handleFileClick = (type) => {
    setMediaType(type);
    fileInputRef.current.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const res = await postAPI.uploadFile(file);
      setMedia([...media, { type: res.data.type, url: res.data.url }]);
    } catch (err) {
      console.error('Error uploading file:', err);
      alert('Failed to upload file. Please try again.');
    }
    setUploading(false);
    // Reset file input
    e.target.value = '';
  };

  const removeMedia = (index) => {
    setMedia(media.filter((_, i) => i !== index));
  };

  return (
    <div className="post-create">
      <div className="post-create-main">
        <img 
          src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.full_name || 'User')}&background=0a66c2&color=fff`} 
          alt="profile" 
          className="profile-image" 
        />
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
              {uploading && <div className="media-preview-item uploading-placeholder">Uploading...</div>}
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
                <button type="button" onClick={addMediaUrl}>Add</button>
                <button type="button" className="cancel-btn" onClick={() => setShowMediaInput(false)}>Cancel</button>
              </div>
            </div>
          )}

          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            onChange={handleFileChange}
            accept="image/*,video/*"
          />

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
              <button 
                type="button" 
                className="media-btn upload-btn"
                onClick={() => handleFileClick('all')}
              >
                <span className="icon">📁</span> Upload
              </button>
            </div>
            <button 
              type="submit" 
              className="submit-post-btn"
              onClick={handlePostSubmit}
              disabled={loading || uploading || (!content.trim() && media.length === 0)}
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
