import React, { useContext } from 'react';
import { postAPI } from '../api';
import { AuthContext } from '../AuthContext';
import '../styles/PostCard.css';

const PostCard = ({ post, onUpdate, navigateToProfile }) => {
  const { user } = useContext(AuthContext);
  const [commentText, setCommentText] = React.useState('');
  const [showComments, setShowComments] = React.useState(false);

  // 🔎 Local state for dynamic comments
  const [comments, setComments] = React.useState(post.comments || []);
  const [skip, setSkip] = React.useState(comments.length);
  const [hasMore, setHasMore] = React.useState(true);

  const handleLike = async () => {
    if (!user) return alert('Please login again');
    try {
      let res;
      if (post.didLike === true) {
        res = await postAPI.unlikePost(post.id);
      } else {
        res = await postAPI.likePost(post.id);
      }
      onUpdate(post.id, res.data);
    } catch (err) {
      console.error('Error liking post:', err);
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      const res = await postAPI.commentPost(post.id, commentText);
      const newPost = res.data;
      
      // Update local comments state - backend returns newest first, so [0] is our new comment
      const latestComment = newPost.comments[0]; 
      setComments(prev => [
        {
          id: latestComment?.id || Date.now(),
          userName: user?.full_name || user?.name || 'User',
          userImage: user?.profileImage || null,
          text: commentText,
          createdAt: new Date().toISOString()
        },
        ...prev
      ]);
      
      setCommentText('');
      onUpdate(post.id, newPost);
    } catch (err) {
      console.error('Error commenting:', err);
    }
  };

  const loadMoreComments = async () => {
    try {
      const newComments = (await postAPI.fetchComments(post.id, 5, skip)).data;
      if (newComments.length === 0) {
        setHasMore(false);
        return;
      }

      setComments(prev => [...prev, ...newComments]);
      setSkip(prev => prev + newComments.length);
    } catch (err) {
      console.error('Error loading more comments:', err);
    }
  };

  const [showCopied, setShowCopied] = React.useState(false);

  const handleShare = async () => {
    try {
      const res = await postAPI.sharePost(post.id);
      const shareUrl = `${window.location.origin}/post/${post.id}`;
      await navigator.clipboard.writeText(shareUrl);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
      onUpdate(post.id, res.data);
    } catch (err) {
      console.error('Error sharing post:', err);
    }
  };

  const handleImageError = (e, type, name = 'User') => {
    if (e.target.dataset.errorHandled) return;
    e.target.dataset.errorHandled = "true";
    if (type === 'profile') {
      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=f8c102&color=fff`;
    } else {
      e.target.src = 'https://placehold.co/400x300?text=Image+Unavailable';
    }
  };

  const renderMedia = () => {
    let mediaItems = [];
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

    mediaItems = rawItems.map(item => {
      if (typeof item === 'string') return { type: 'image', url: item };
      if (item && typeof item === 'object') {
        return { type: item.type || 'image', url: item.url };
      }
      return null;
    }).filter(item => item && item.url);

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
  const commentsCount = post.commentsCount ?? comments.length;
  const sharesCount = post.sharesCount ?? (post.shares || 0);
  const isLiked = post.didLike === true;

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
          <svg viewBox="0 0 24 24" className="icon">
            <path d="M19.46,11l-3.91-3.91a7,7,0,0,1-1.69-2.74l-.49-1.47A2.76,2.76,0,0,0,10.76,1a2.75,2.75,0,0,0-2.43,1.57L7.74,4.24a5,5,0,0,1-.31,2.48L6,11H1V22H21a3,3,0,0,0,3-3V14.54A3.7,3.7,0,0,0,19.46,11ZM7,20H3V13H7ZM22,19a1,1,0,0,1-1,1H9V12.41l1.43-1.43a3,3,0,0,0,.71-1.53L12.39,6a7,7,0,0,1,.43-2.12.74.74,0,0,1,.15-.24.75.75,0,0,1,.67-.41.76.76,0,0,1,.7.47l.49,1.47a9,9,0,0,0,2.14,3.47l3.91,3.91A1.7,1.7,0,0,1,22,14.54Z" />
          </svg>
          <span className="label">{isLiked ? 'Unlike' : 'Like'}</span>
        </button>
        <button onClick={() => setShowComments(!showComments)} className="action-btn">
          <svg viewBox="0 0 24 24" className="icon">
            <path d="M21,2H3A1,1,0,0,0,2,3V16a1,1,0,0,0,1,1h4.29l3.15,3.15a1.2,1.2,0,0,0,1.12.35,1.21,1.21,0,0,0,1-.95L13,17h8a1,1,0,0,0,1-1V3A1,1,0,0,0,21,2ZM20,15H12.34a1,1,0,0,0-.73.31L10.32,16.6l-.32-3.6a1,1,0,0,0-1-.91h-6V4H20Z" />
          </svg>
          <span className="label">Comment</span>
        </button>
        <button onClick={handleShare} className="action-btn share-btn">
          <svg viewBox="0 0 24 24" className="icon">
            <path d="M23.12,9.91,19,5.79a1,1,0,0,0-1.41,0,1,1,0,0,0,0,1.42L20.17,9.8H7.36a3,3,0,0,0-3,3V20a1,1,0,0,0,2,0V12.8a1,1,0,0,1,1-1h12.8l-2.58,2.59a1,1,0,0,0,0,1.42,1,1,0,0,0,1.41,0l4.13-4.12A1.41,1.41,0,0,0,23.12,9.91Z" />
          </svg>
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
            {comments.map((comment, index) => (
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
                    <span className="divider"></span>
                    <button className="sub-action-btn" onClick={() => setCommentText(`@${comment.userName} `)}>Reply</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {hasMore && (
            <button onClick={loadMoreComments} className="load-more-btn">
              Load more comments
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default React.memo(PostCard);
