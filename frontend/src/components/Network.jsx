import React, { useState, useEffect, useContext } from 'react';
import { userAPI, networkAPI } from '../api';
import { AuthContext } from '../AuthContext';
import '../styles/Network.css';

const Network = ({ navigateToProfile }) => {
  const [users, setUsers] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const { user } = useContext(AuthContext);
  const [followingIds, setFollowingIds] = useState(user?.following || []);

  const RELATION_LABEL = {
    friend: 'Mutual friend',
    same_school: 'Same school',
    same_company: 'Same company',
    popular: 'Popular',
  };

  useEffect(() => {
    userAPI.getAllUsers()
      .then(res => setUsers(res.data.filter(u => String(u.id) !== String(user?.id))))
      .catch(err => console.error('Error fetching users:', err));

    if (user?.id) {
      networkAPI.getSuggestionsAll(String(user.id))
        .then(res => setSuggestions(res.data))
        .catch(() => {});

      networkAPI.getFollowing(String(user.id))
        .then(res => {
          const ids = res.data.map(item => item.user_id);
          setFollowingIds(ids);
        })
        .catch(err => console.error('Error fetching following list:', err));
    }
  }, [user?.id]);

  const handleFollow = async (userId) => {
    try {
      await networkAPI.follow(String(user.id), String(userId));
      setFollowingIds([...followingIds, userId]);
    } catch (err) {
      console.error('Error following user:', err);
    }
  };

  const handleUnfollow = async (userId) => {
    try {
      await networkAPI.unfollow(String(userId));
      setFollowingIds(followingIds.filter(id => String(id) !== String(userId)));
    } catch (err) {
      console.error('Error unfollowing user:', err);
    }
  };

  // Enrich suggestions with avatar and location from the users array
  const enrichedSuggestions = suggestions.map(s => {
    const fullUser = users.find(u => String(u.id) === String(s.user_id));
    return fullUser ? { ...s, avatar_url: fullUser.avatar_url, location: fullUser.location } : s;
  });

  return (
    <div className="network-container">
      <h2>Network</h2>

      {enrichedSuggestions.length > 0 && (
        <section>
          <h3>People You May Know</h3>
          <div className="users-grid">
            {enrichedSuggestions.map((s) => (
              <div key={s.user_id} className="user-card">
                <div onClick={() => navigateToProfile(s.user_id)} className="user-info-link" style={{cursor: 'pointer'}}>
                  <img 
                    src={s.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name || 'User')}&background=0a66c2&color=fff`} 
                    alt={s.name} 
                    className="user-image"
                  />
                  <h4>{s.name}</h4>
                  <p className="title">{s.headline || 'No headline available'}</p>
                  {s.location && <p className="location-text">{s.location}</p>}
                </div>
                {s.relation !== 'friend' && <p className="relation-badge">{RELATION_LABEL[s.relation] || s.relation}</p>}
                <button
                  onClick={() => followingIds.includes(s.user_id) ? handleUnfollow(s.user_id) : handleFollow(s.user_id)}
                  className={followingIds.includes(s.user_id) ? 'following' : 'follow'}
                >
                  {followingIds.includes(s.user_id) ? 'Following' : 'Follow'}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h3>All Users</h3>
        <div className="users-grid">
          {users.map((u) => (
            <div key={u.id} className="user-card">
              <div onClick={() => navigateToProfile(u.id)} className="user-info-link" style={{cursor: 'pointer'}}>
                <img 
                  src={u.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.full_name || u.name || 'User')}&background=0a66c2&color=fff`} 
                  alt={u.full_name || u.name} 
                  className="user-image"
                />
                <h4>{u.full_name || u.name}</h4>
                <p className="title">{u.headline || u.title || 'No headline available'}</p>
                {u.location && <p className="location-text">{u.location}</p>}
              </div>
              <button
                onClick={() => followingIds.includes(String(u.id)) ? handleUnfollow(u.id) : handleFollow(u.id)}
                className={followingIds.includes(String(u.id)) ? 'following' : 'follow'}
                style={{marginTop: '10px'}}
              >
                {followingIds.includes(String(u.id)) ? 'Following' : 'Follow'}
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Network;
