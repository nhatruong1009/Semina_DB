import React, { useState, useEffect, useContext } from 'react';
import { useParams } from 'react-router-dom';
import { profileAPI, networkAPI, jobAPI, skillAPI } from '../api';
import { AuthContext } from '../AuthContext';
import '../styles/Profile.css';

const CameraIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
    <circle cx="12" cy="12" r="3.2"/>
    <path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/>
  </svg>
);

const PencilIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a.996.996 0 0 0 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
  </svg>
);

const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
    <path d="M19 11h-6V5h-2v6H5v2h6v6h2v-6h6v-2z"/>
  </svg>
);

const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
  </svg>
);

const GroupIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
    <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
  </svg>
);

const ChartIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
  </svg>
);

const SuitcaseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
    <path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z"/>
  </svg>
);

const Profile = ({ userId: propUserId, navigateToProfile }) => {
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
  const [appliedJobs, setAppliedJobs] = useState([]);
  const [skills, setSkills] = useState([]);
  const [allSkills, setAllSkills] = useState([]);
  const [skillInput, setSkillInput] = useState('');
  const [showSkillInput, setShowSkillInput] = useState(false);
  const [showModalType, setShowModalType] = useState(null);
  const [isEditingOpenToWork, setIsEditingOpenToWork] = useState(false);
  const [openToWorkRoles, setOpenToWorkRoles] = useState('Product Designer, UX Designer roles');
  const [openToWorkInput, setOpenToWorkInput] = useState('');

  useEffect(() => {
    if (targetUserId) {
      fetchProfile();
      fetchSocialStats();
      fetchSkills();
      if (String(currentUser?.id) === String(targetUserId)) {
        fetchAppliedJobs();
        skillAPI.getAllSkills().then(res => setAllSkills(res.data)).catch(() => {});
      }
    }
  }, [targetUserId, currentUser]);

  const fetchSkills = async () => {
    try {
      const res = await skillAPI.getUserSkills(targetUserId);
      setSkills(res.data);
    } catch (err) {}
  };

  const handleAddSkill = async (name) => {
    if (!name.trim()) return;
    try {
      await skillAPI.addSkill(targetUserId, name.trim());
      setSkillInput('');
      setShowSkillInput(false);
      fetchSkills();
    } catch (err) {
      console.error('Add skill failed:', err);
    }
  };

  const handleRemoveSkill = async (skillName) => {
    try {
      await skillAPI.removeSkill(targetUserId, skillName);
      fetchSkills();
    } catch (err) {
      console.error('Remove skill failed:', err);
    }
  };

  const fetchAppliedJobs = async () => {
    try {
      const res = await jobAPI.getApplied();
      setAppliedJobs(res.data || []);
    } catch (err) {
      console.error('Error fetching applied jobs', err);
    }
  };

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

  const isFollowing = followers.some(f => String(f.user_id || f._id || f.id) === String(currentUser?.id));

  const handleFollow = async () => {
    try {
      await networkAPI.follow(String(currentUser?.id || currentUser?._id), String(targetUserId));
      fetchSocialStats();
    } catch (err) {
      console.error('Follow failed', err);
    }
  };

  const handleUnfollow = async () => {
    try {
      await networkAPI.unfollow(targetUserId);
      fetchSocialStats();
    } catch (err) {
      console.error('Unfollow failed', err);
    }
  };

  if (loading) return <div className="profile-loading">Loading profile...</div>;
  if (!profile) return <div className="profile-error">Profile not found.</div>;

  return (
    <div className="profile-page animate-in">
      <div className="profile-container">
        
        {/* Header Section: Cover and Avatar */}
        <div className="profile-card profile-header-card">
          <div className="cover-photo" style={{ backgroundImage: `url(${profile.cover_url || 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1200&q=80'})` }}>
            {isMe && <button className="edit-cover-btn" aria-label="Edit cover photo"><CameraIcon /></button>}
          </div>
          
          <div className="profile-info-section">
            <div className="profile-info-top">
              <div className="avatar-wrapper">
                <img 
                  src={profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name)}&background=0a66c2&color=fff&size=200`} 
                  alt={profile.full_name} 
                  className="profile-avatar-img"
                />
                {isMe && <button className="edit-avatar-btn" aria-label="Edit avatar"><PlusIcon /></button>}
              </div>
              {isMe && (
                <button className="edit-profile-btn" onClick={() => setIsEditing(true)}>
                  <PencilIcon />
                </button>
              )}
            </div>

            <div className="profile-main-meta">
              <h1 className="profile-name">{profile.full_name}</h1>
              <p className="profile-headline-text">{profile.headline || 'No headline set'}</p>
              <p className="profile-location-text">
                {profile.location || 'Location not set'} • <span className="stat-link clickable-stat" onClick={() => setShowModalType('followers')} style={{cursor: 'pointer'}}>{followers.length} followers</span>
              </p>
            </div>

            <div className="profile-action-buttons">
              {isMe ? (
                <>
                  <button className="btn-connect" onClick={() => setIsEditing(true)}>Open to</button>
                  <button className="btn-message" onClick={() => { setOpenToWorkInput(openToWorkRoles); setIsEditingOpenToWork(true); }}>Add profile section</button>
                  <button className="btn-more">...</button>
                </>
              ) : (
                <>
                  <button 
                    className={isFollowing ? "btn-message" : "btn-connect"} 
                    onClick={isFollowing ? handleUnfollow : handleFollow}
                  >
                    {isFollowing ? 'Following' : '+ Follow'}
                  </button>
                  <button className="btn-message">Message</button>
                  <button className="btn-more">...</button>
                </>
              )}
            </div>

            <div className="open-to-work-box">
              <h4>Open to work</h4>
              <p>{openToWorkRoles}</p>
            </div>
          </div>
        </div>

        {/* Analytics Section */}
        {isMe && (
          <div className="profile-card analytics-card">
            <div className="section-header analytics-header">
              <h3>Analytics</h3>
              <div className="private-badge">
                <EyeIcon /> <span>Private to you</span>
              </div>
            </div>
            <div className="analytics-grid">
              <div className="analytics-item clickable-stat" onClick={() => setShowModalType('appliedJobs')}>
                <SuitcaseIcon />
                <div className="analytics-content">
                  <h4>{appliedJobs.length}</h4>
                  <p>Applied jobs</p>
                  <span className="analytics-sub">Click to view list</span>
                </div>
              </div>
              <div className="analytics-item clickable-stat" onClick={() => setShowModalType('followers')}>
                <GroupIcon />
                <div className="analytics-content">
                  <h4>{followers.length}</h4>
                  <p>Followers</p>
                  <span className="analytics-sub">Click to view list</span>
                </div>
              </div>
              <div className="analytics-item clickable-stat" onClick={() => setShowModalType('following')}>
                <GroupIcon />
                <div className="analytics-content">
                  <h4>{following.length}</h4>
                  <p>Following</p>
                  <span className="analytics-sub">Click to view list</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* About Section */}
        <div className="profile-card">
          <div className="section-header">
            <h3>About</h3>
            {isMe && <button className="icon-btn" onClick={() => setIsEditing(true)}><PencilIcon /></button>}
          </div>
          <div className="profile-bio-text">
            {profile.bio ? (
              profile.bio.split('\n').map((line, idx) => (
                <span key={idx}>{line}<br /></span>
              ))
            ) : "Senior Product Designer with over 8 years of experience building human-centered digital experiences at scale. My expertise lies at the intersection of UI/UX design, design systems, and product strategy. I am passionate about solving complex user problems through elegant, intuitive design solutions that drive business growth and user satisfaction."}
          </div>
        </div>

        {/* Skills Section */}
        <div className="profile-card">
          <div className="section-header">
            <h3>Skills</h3>
            {isMe && (
              <button className="icon-btn" onClick={() => setShowSkillInput(v => !v)}>
                <PlusIcon />
              </button>
            )}
          </div>

          {isMe && showSkillInput && (
            <div className="skill-add-row">
              <input
                list="skill-suggestions"
                value={skillInput}
                onChange={e => setSkillInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddSkill(skillInput)}
                placeholder="Type a skill and press Enter..."
                className="skill-input"
              />
              <datalist id="skill-suggestions">
                {allSkills
                  .filter(s => !skills.some(us => us.name === s.name))
                  .map(s => <option key={s.skill_id} value={s.name} />)}
              </datalist>
              <button className="save-btn" onClick={() => handleAddSkill(skillInput)}>Add</button>
            </div>
          )}

          <div className="skills-list">
            {skills.length > 0 ? skills.map(s => (
              <span key={s.skill_id || s.name} className="skill-tag">
                {s.name}
                {isMe && (
                  <button className="skill-remove-btn" onClick={() => handleRemoveSkill(s.name)}>×</button>
                )}
              </span>
            )) : <p className="empty-skills">No skills added yet.</p>}
          </div>
        </div>

        {/* Experience placeholder */}
        <div className="profile-card">
          <div className="section-header">
            <h3>Experience</h3>
            {isMe && (
              <div className="section-header-actions">
                <button className="icon-btn"><PlusIcon /></button>
                <button className="icon-btn"><PencilIcon /></button>
              </div>
            )}
          </div>
          <div className="experience-item">
            <img src="https://ui-avatars.com/api/?name=Google&background=fff&color=000&size=64" alt="Logo" className="item-logo-img" />
            <div className="item-details">
              <h4>Senior Product Designer</h4>
              <p className="item-company">Google • Full-time</p>
              <p className="item-date">Jan 2021 - Present • 3 yrs 4 mos</p>
              <p className="item-description">Leading design initiatives for Search and AI integrations. Developing scalable design systems and improving accessibility frameworks.</p>
            </div>
          </div>
        </div>
        
      </div>

      {/* Details Modal */}
      {showModalType && (
        <div className="modal-overlay" onClick={() => setShowModalType(null)}>
          <div className="modal-content list-modal animate-pop" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{showModalType === 'appliedJobs' ? 'Applied Jobs' : showModalType === 'followers' ? 'Followers' : 'Following'}</h3>
              <button className="close-btn" onClick={() => setShowModalType(null)}>&times;</button>
            </div>
            <div className="modal-body">
              {showModalType === 'appliedJobs' && (
                <div className="job-list">
                   {appliedJobs.length > 0 ? appliedJobs.map(job => (
                     <div key={job._id || job.id} className="job-list-item">
                        <div className="job-info">
                          <h4>{job.jobId?.title || job.title || 'Unknown Job'}</h4>
                          <p>{job.jobId?.company_id?.name || job.company_name || 'Unknown Company'} • {job.jobId?.location || job.location || ''}</p>
                          <span className="job-status">Status: {job.status || 'Applied'}</span>
                        </div>
                     </div>
                   )) : <p>You haven't applied to any jobs yet.</p>}
                </div>
              )}
              {showModalType === 'followers' && (
                <div className="follower-list">
                  {followers.length > 0 ? followers.map(f => (
                    <div 
                      key={f.user_id || f._id} 
                      className="follower-list-item" 
                      onClick={() => {
                        setShowModalType(null);
                        navigateToProfile(f.user_id || f._id);
                      }}
                      style={{cursor: 'pointer'}}
                    >
                       <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(f.name || 'User')}&background=0a66c2&color=fff`} alt={f.name || 'User'} />
                       <div className="follower-info">
                         <h4>{f.name || 'Unknown User'}</h4>
                       </div>
                    </div>
                  )) : <p>No followers yet.</p>}
                </div>
              )}
              {showModalType === 'following' && (
                <div className="follower-list">
                  {following.length > 0 ? following.map(f => (
                    <div 
                      key={f.user_id || f._id} 
                      className="follower-list-item"
                      onClick={() => {
                        setShowModalType(null);
                        navigateToProfile(f.user_id || f._id);
                      }}
                      style={{cursor: 'pointer'}}
                    >
                       <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(f.name || 'User')}&background=0a66c2&color=fff`} alt={f.name || 'User'} />
                       <div className="follower-info">
                         <h4>{f.name || 'Unknown User'}</h4>
                       </div>
                    </div>
                  )) : <p>Not following anyone yet.</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Intro Modal */}
      {isEditing && (
        <div className="modal-overlay" onClick={() => setIsEditing(false)}>
          <div className="modal-content profile-edit-modal animate-pop" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Intro</h3>
              <button className="close-btn" onClick={() => setIsEditing(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <form id="edit-profile-form" onSubmit={handleUpdate} className="edit-profile-form">
                <div className="form-group">
                  <label>First name *</label>
                  <input type="text" name="full_name" value={formData.full_name || ''} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label>Headline *</label>
                  <textarea name="headline" value={formData.headline || ''} onChange={handleChange} rows="2" />
                </div>
                <div className="form-group">
                  <label>Location</label>
                  <input type="text" name="location" value={formData.location || ''} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>About</label>
                  <textarea name="bio" value={formData.bio || ''} onChange={handleChange} rows="5" />
                </div>
                <div className="form-group">
                  <label>Avatar URL</label>
                  <input type="text" name="avatar_url" value={formData.avatar_url || ''} onChange={handleChange} placeholder="https://example.com/avatar.jpg" />
                </div>
                <div className="form-group">
                  <label>Cover URL</label>
                  <input type="text" name="cover_url" value={formData.cover_url || ''} onChange={handleChange} placeholder="https://example.com/cover.jpg" />
                </div>
              </form>
            </div>
            <div className="modal-footer">
              <button type="submit" form="edit-profile-form" className="save-btn">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Open To Work Modal */}
      {isEditingOpenToWork && (
        <div className="modal-overlay" onClick={() => setIsEditingOpenToWork(false)}>
          <div className="modal-content profile-edit-modal animate-pop" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add profile section: Open to work</h3>
              <button className="close-btn" onClick={() => setIsEditingOpenToWork(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <form id="edit-open-to-work-form" onSubmit={(e) => { e.preventDefault(); setOpenToWorkRoles(openToWorkInput); setIsEditingOpenToWork(false); }} className="edit-profile-form">
                <div className="form-group">
                  <label>Job titles you're open to</label>
                  <input 
                    type="text" 
                    value={openToWorkInput} 
                    onChange={(e) => setOpenToWorkInput(e.target.value)} 
                    placeholder="e.g. Product Designer, Software Engineer" 
                    required 
                  />
                </div>
              </form>
            </div>
            <div className="modal-footer">
              <button type="submit" form="edit-open-to-work-form" className="save-btn">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
