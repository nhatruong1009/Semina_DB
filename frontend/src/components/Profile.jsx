import React, { useState, useEffect, useContext } from 'react';
import { useParams } from 'react-router-dom';
import { profileAPI, networkAPI } from '../api';
import { AuthContext } from '../AuthContext';
import '../styles/Profile.css';

const Profile = ({ userId: propUserId }) => {
  const { userId: paramUserId } = useParams();
  const targetUserId = propUserId || paramUserId;
  
  const { user: currentUser } = useContext(AuthContext);
  const isMe = String(currentUser?.id) === String(targetUserId);

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [connections, setConnections] = useState([]);

  useEffect(() => {
    if (targetUserId) {
      fetchProfile();
      fetchSocialStats();
    }
  }, [targetUserId]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await profileAPI.getProfile(targetUserId);
      setProfile(res.data);
      setFormData(res.data);
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
    setLoading(false);
  };

  const fetchSocialStats = async () => {
    try {
      const followersRes = await networkAPI.getFollowers(targetUserId);
      const followingRes = await networkAPI.getFollowing(targetUserId);
      const connectionsRes = await networkAPI.getConnections(targetUserId);
      setFollowers(followersRes.data);
      setFollowing(followingRes.data);
      setConnections(connectionsRes.data);
    } catch (err) {
      console.error('Error fetching social stats:', err);
    }
  };


  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await profileAPI.updateProfile(formData);
      setIsEditing(false);
      fetchProfile();
    } catch (err) {
      console.error('Update failed:', err);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  if (loading) return <div className="profile-loading">Loading profile...</div>;
  if (!profile) return <div className="profile-error">Profile not found.</div>;

  return (
    <div className="profile-page animate-in">
      <div className="profile-container">
        {/* Header Section: Cover and Avatar */}
        <div className="profile-header-card">
          <div className="cover-photo" style={{ backgroundImage: `url(${profile.cover_url || 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809'})` }}>
            {isMe && <button className="edit-cover-btn">📷</button>}
          </div>
          
          <div className="profile-info-section">
            <div className="avatar-wrapper">
              <img 
                src={profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name)}&background=0a66c2&color=fff&size=200`} 
                alt={profile.full_name} 
                className="profile-avatar-img"
              />
              {isMe && <button className="edit-avatar-btn">📷</button>}
            </div>

            <div className="profile-main-meta">
              <div className="name-headline-group">
                <h1 className="profile-name">{profile.full_name}</h1>
                <p className="profile-headline-text">{profile.headline || 'No headline set'}</p>
                <p className="profile-location-text">📍 {profile.location || 'Location not set'} • <span className="contact-info-link">Contact info</span></p>
                <p className="profile-connections-count">
                  <span className="stat-link">{connections.length} connections</span> • <span className="stat-link">{followers.length} followers</span> • <span className="stat-link">{following.length} following</span>
                </p>
              </div>

              <div className="profile-actions">
                {isMe ? (
                  <button className="primary-btn" onClick={() => setIsEditing(true)}>Edit Profile</button>
                ) : (
                  <>
                    <button className="primary-btn">Connect</button>
                    <button className="secondary-btn">Message</button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Social Stats Grid */}
        <div className="profile-social-grid">
          <div className="profile-section-card">
            <h3>Connections ({connections.length})</h3>
            <div className="small-user-list">
              {connections.length > 0 ? connections.map(f => (
                <div key={f.user_id} className="small-user-item">
                  <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(f.name)}&background=0a66c2&color=fff`} alt={f.name} />
                  <span>{f.name}</span>
                </div>
              )) : <p className="empty-msg">No connections yet.</p>}
            </div>
          </div>

          <div className="profile-section-card">
            <h3>Followers ({followers.length})</h3>
            <div className="small-user-list">
              {followers.length > 0 ? followers.map(f => (
                <div key={f.user_id} className="small-user-item">
                  <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(f.name)}&background=e8591a&color=fff`} alt={f.name} />
                  <span>{f.name}</span>
                </div>
              )) : <p className="empty-msg">No followers yet.</p>}
            </div>
          </div>

          <div className="profile-section-card">
            <h3>Following ({following.length})</h3>
            <div className="small-user-list">
              {following.length > 0 ? following.map(f => (
                <div key={f.user_id} className="small-user-item">
                  <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(f.name)}&background=057642&color=fff`} alt={f.name} />
                  <span>{f.name}</span>
                </div>
              )) : <p className="empty-msg">Not following anyone yet.</p>}
            </div>
          </div>
        </div>

        {/* About Section */}
        <div className="profile-section-card">
          <div className="section-header">
            <h3>About</h3>
            {isMe && <button className="edit-section-btn" onClick={() => setIsEditing(true)}>✏️</button>}
          </div>
          <p className="profile-bio-text">
            {profile.bio || "This user hasn't added a bio yet."}
          </p>
        </div>

        {/* Experience placeholder */}
        <div className="profile-section-card">
          <div className="section-header">
            <h3>Experience</h3>
            {isMe && <button className="add-item-btn">+</button>}
          </div>
          <div className="experience-item">
            <div className="item-logo">🏢</div>
            <div className="item-details">
              <h4>Software Engineer</h4>
              <p>Self-employed • Full-time</p>
              <p className="item-date">Jan 2020 - Present</p>
            </div>
          </div>
        </div>
      </div>


      {/* Edit Modal */}
      {isEditing && (
        <div className="modal-overlay" onClick={() => setIsEditing(false)}>
          <div className="modal-content profile-edit-modal animate-pop" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Intro</h3>
              <button className="close-btn" onClick={() => setIsEditing(false)}>&times;</button>
            </div>
            <form onSubmit={handleUpdate} className="edit-profile-form">
              <div className="form-group">
                <label>Full Name</label>
                <input type="text" name="full_name" value={formData.full_name || ''} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Headline</label>
                <input type="text" name="headline" value={formData.headline || ''} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Location</label>
                <input type="text" name="location" value={formData.location || ''} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Bio</label>
                <textarea name="bio" value={formData.bio || ''} onChange={handleChange} rows="4" />
              </div>
              <div className="form-group">
                <label>Avatar URL</label>
                <input type="text" name="avatar_url" value={formData.avatar_url || ''} onChange={handleChange} placeholder="https://example.com/avatar.jpg" />
              </div>
              <div className="form-group">
                <label>Cover URL</label>
                <input type="text" name="cover_url" value={formData.cover_url || ''} onChange={handleChange} placeholder="https://example.com/cover.jpg" />
              </div>

              <div className="form-actions">
                <button type="submit" className="save-btn">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
