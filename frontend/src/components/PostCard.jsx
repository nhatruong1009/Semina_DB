import React, { useContext } from 'react';
import { postAPI } from '../api';
import { AuthContext } from '../AuthContext';
import '../styles/PostCard.css';

const PostCard = ({ post, onUpdate }) => {
  const { user } = useContext(AuthContext);
  const [commentText, setCommentText] = React.useState('');
  const [showComments, setShowComments] = React.useState(false);

  const handleLike = async () => {
    if (!user) return alert('Please login again');
    try {
      if (post.likes.includes(user.id)) {
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

  const handleShare = async () => {
    try {
      await postAPI.sharePost(post.id);
      onUpdate();
    } catch (err) {
      console.error('Error sharing post:', err);
    }
  };

  const isLiked = post.likes.includes(user?.id);

  return (
    <div className="post-card">
      <div className="post-header">
        <img 
          src={post.author?.profileImage || "https://via.placeholder.com/150"} 
          alt="author" 
          className="profile-image" 
          onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${post.author?.name || 'U'}&background=random`; }}
        />
        <div className="post-info">
          <h4>{post.author?.name || "User"}</h4>
          <p className="post-title">{post.author?.title || post.author?.headline || "Member"}</p>
          <p className="post-time">{post.createdAt ? new Date(post.createdAt).toLocaleDateString() : "Just now"}</p>
        </div>
      </div>

      <div className="post-content">
        <p>{post.content}</p>
        {post.images && post.images.length > 0 && (
          <div className={`post-images-grid ${post.images.length > 1 ? 'grid-multiple' : ''}`}>
            {post.images.map((img, index) => (
              <img 
                key={index}
                src={img} 
                alt={`post-${index}`} 
                className="post-image-item"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="post-stats">
        <span>{post.likes?.length || 0} likes</span>
        <span>{post.comments?.length || 0} comments</span>
        <span>{post.shares || 0} shares</span>
      </div>

      <div className="post-actions">
        <button onClick={handleLike} className={isLiked ? 'active' : ''}>
          👍 Like
        </button>
        <button onClick={() => setShowComments(!showComments)}>
          💬 Comment
        </button>
        <button onClick={handleShare}>
          🔗 Share
        </button>
      </div>

      {showComments && (
        <div className="comments-section">
          <div className="comments-list">
            {post.comments.map((comment) => (
              <div key={comment.id} className="comment">
                <strong>{comment.userName || "User"}</strong>
                <p>{comment.text}</p>
              </div>
            ))}
          </div>
          <form onSubmit={handleComment} className="comment-form">
            <input
              type="text"
              placeholder="Add a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
            />
            <button type="submit">Comment</button>
          </form>
        </div>
      )}
    </div>
  );
};

export default PostCard;
