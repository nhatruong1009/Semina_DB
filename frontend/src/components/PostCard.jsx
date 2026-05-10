import React, { useContext } from 'react';
import { postAPI } from '../api';
import { AuthContext } from '../AuthContext';
import '../styles/PostCard.css';

const PostCard = ({ post, onUpdate, navigateToProfile }) => {
  const { user } = useContext(AuthContext);
  const [commentText, setCommentText] = React.useState('');
  const [showComments, setShowComments] = React.useState(false);

  const handleLike = async () => {
    if (!user) return alert('Please login again');
    try {
      const likes = post.likes || [];
      if (likes.includes(user.id)) {
        await postAPI.unlikePost(post.id);
      } else {
        await postAPI.likePost(post.id);
      }
      onUpdate();
    } catch (err) {
      console.error('Error liking post:', err);
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      await postAPI.commentPost(post.id, commentText);
      setCommentText('');
      onUpdate();
    } catch (err) {
      console.error('Error commenting:', err);
    }
  };

  const [showCopied, setShowCopied] = React.useState(false);

  const handleShare = async () => {
    try {
      await postAPI.sharePost(post.id);
      
      const shareUrl = `${window.location.origin}/post/${post.id}`;
      await navigator.clipboard.writeText(shareUrl);
      
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
      
      onUpdate();
    } catch (err) {
      console.error('Error sharing post:', err);
    }
  };

  const handleImageError = (e, type, name = 'User') => {
    // Prevent infinite loop if the fallback itself fails
    if (e.target.dataset.errorHandled) return;
    e.target.dataset.errorHandled = "true";

    if (type === 'profile') {
      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=f8c102&color=fff`;
    } else {
      // Use a more stable placeholder or a base64 transparent pixel as final fallback
      e.target.src = 'https://placehold.co/400x300?text=Image+Unavailable';
      // If even this fails, the next call will be caught by the data-error-handled check
    }
  };

  const renderMedia = () => {
    let mediaItems = [];
    
    // Collect media from all possible sources
    let rawItems = [];
    if (post.content && typeof post.content === 'object' && Array.isArray(post.content.media)) {
      rawItems = [...post.content.media];
    }
    if (Array.isArray(post.images)) {
      post.images.forEach(url => {
        if (!rawItems.find(item => item.url === url)) {
          rawItems.push({ type: 'image', url });
        }
      });
    }
    if (post.image && !rawItems.find(item => item.url === post.image)) {
      rawItems.push({ type: 'image', url: post.image });
    }

    // Normalize and filter
    mediaItems = rawItems.map(item => {
      if (typeof item === 'string') return { type: 'image', url: item };
      if (item && typeof item === 'object') {
        return {
          type: item.type || 'image',
          url: item.url
        };
      }
      return null;
    }).filter(item => item && item.url);

    // De-duplicate by URL to be safe
    const seenUrls = new Set();
    mediaItems = mediaItems.filter(item => {
      if (seenUrls.has(item.url)) return false;
      seenUrls.add(item.url);
      return true;
    });

    if (mediaItems.length === 0) return null;

    const gridClass = mediaItems.length === 1 ? 'grid-1' : 
                     mediaItems.length === 2 ? 'grid-2' :
                     mediaItems.length === 3 ? 'grid-3' : 'grid-4';

    return (
      <div className={`post-media ${gridClass}`}>
        {mediaItems.slice(0, 4).map((item, index) => (
          <div key={index} className="media-wrapper">
            {item.type === 'video' ? (
              <video src={item.url} controls className="post-video" />
            ) : (
              <img 
                src={item.url} 
                alt={`media-${index}`} 
                onError={(e) => handleImageError(e, 'post')}
              />
            )}
            {index === 3 && mediaItems.length > 4 && (
              <div className="more-media">+{mediaItems.length - 4}</div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const likesCount = post.likesCount ?? (post.likes?.length || 0);
  const commentsCount = post.commentsCount ?? (post.comments?.length || 0);
  const sharesCount = post.sharesCount ?? (post.shares || 0);
  const isLiked = (post.likes || []).includes(user?.id);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
  };

  return (
    <div className="post-card">
      {showCopied && <div className="copied-badge">Link copied to clipboard!</div>}
      <div className="post-header">
        <img 
          src={post.author?.profileImage} 
          alt="author" 
          className="profile-image clickable" 
          onError={(e) => handleImageError(e, 'profile', post.author?.name)}
          onClick={() => navigateToProfile(post.author_id || post.author?.id || post.user_id || post.author?._id)}
        />
        <div className="post-info">
          <h4 className="author-name clickable" onClick={() => navigateToProfile(post.author_id || post.author?.id || post.user_id || post.author?._id)}>
            {post.author?.name || 'User'}
          </h4>
          <p className="author-headline">{post.author?.headline || post.author?.title || ''}</p>
          <p className="post-time">{formatDate(post.createdAt || post.created_at)}</p>
        </div>
      </div>

      <div className="post-content">
        <p className="post-text">{typeof post.content === 'object' ? post.content.text : post.content}</p>
        {renderMedia()}
      </div>

      <div className="post-stats-row">
        <div className="stats-col left">
          {likesCount > 0 && <span>{likesCount} likes</span>}
        </div>
        <div className="stats-col center">
          {commentsCount > 0 && <span>{commentsCount} comments</span>}
        </div>
        <div className="stats-col right">
          {sharesCount > 0 && <span>{sharesCount} shares</span>}
        </div>
      </div>

      <div className="post-actions-row">
        <button onClick={handleLike} className={`action-btn ${isLiked ? 'active' : ''}`}>
          <span className="icon yellow">👍</span>
          <span className="label">Like</span>
        </button>
        <button onClick={() => setShowComments(!showComments)} className="action-btn">
          <span className="icon">💬</span>
          <span className="label">Comment</span>
        </button>
        <button onClick={handleShare} className="action-btn share-btn">
          <span className="icon grey">🔗</span>
          <span className="label">Share</span>
        </button>
      </div>

      {showComments && (
        <div className="comments-section">
          <form onSubmit={handleComment} className="comment-form">
            <img 
              src={user?.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=random`} 
              alt="user" 
              className="comment-avatar-small"
              onError={(e) => handleImageError(e, 'profile', user?.name)}
            />
            <div className="comment-input-container">
              <textarea
                placeholder="Add a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                rows="1"
              />
              <button type="submit" disabled={!commentText.trim()}>Post</button>
            </div>
          </form>

          <div className="comments-list">
            {(post.comments || []).map((comment, index) => (
              <div key={comment.id || index} className="comment-item">
                <img 
                  src={comment.userImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.userName || 'User')}&background=random`} 
                  alt="user" 
                  className="comment-avatar"
                  onError={(e) => handleImageError(e, 'profile', comment.userName)}
                />
                <div className="comment-body">
                  <div className="comment-bubble">
                    <div className="comment-header">
                      <strong>{comment.userName || 'User'}</strong>
                      <span className="comment-time">{formatDate(comment.createdAt)}</span>
                    </div>
                    <p className="comment-text">{comment.text}</p>
                  </div>
                  <div className="comment-actions">
                    <button className="sub-action-btn">Like</button>
                    <span className="divider">|</span>
                    <button className="sub-action-btn">Reply</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PostCard;
