import React, { useContext } from 'react';
import { postAPI } from '../api';
import { AuthContext } from '../AuthContext';
import '../styles/PostCard.css';

const PostCard = ({ post, onUpdate }) => {
  const { user } = useContext(AuthContext);
  const [commentText, setCommentText] = React.useState('');
  const [showComments, setShowComments] = React.useState(false);

  const handleLike = async () => {
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
        <img src={post.author?.profileImage} alt="author" className="profile-image" />
        <div className="post-info">
          <h4>{post.author?.name}</h4>
          <p className="post-title">{post.author?.title}</p>
          <p className="post-time">{new Date(post.createdAt).toLocaleDateString()}</p>
        </div>
      </div>

      <div className="post-content">
        <p>{post.content}</p>
        {post.image && <img src={post.image} alt="post" />}
      </div>

      <div className="post-stats">
        <span>{post.likes.length} likes</span>
        <span>{post.comments.length} comments</span>
        <span>{post.shares} shares</span>
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
                <strong>{post.author?.name}</strong>
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
