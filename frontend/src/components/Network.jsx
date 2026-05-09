import React, { useState, useEffect, useContext } from 'react';
import { userAPI, networkAPI } from '../api';
import { AuthContext } from '../AuthContext';
import '../styles/Network.css';

const Network = () => {
  const [users, setUsers] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [sameSchool, setSameSchool] = useState([]);
  const [sameCompany, setSameCompany] = useState([]);
  const { user } = useContext(AuthContext);
  const [followingIds, setFollowingIds] = useState(user?.following || []);
  const [connectedIds, setConnectedIds] = useState([]);

  useEffect(() => {
    userAPI.getAllUsers()
      .then(res => setUsers(res.data.filter(u => u.id !== user?.id)))
      .catch(err => console.error('Error fetching users:', err));

    if (user?.id) {
      networkAPI.getSuggestions(String(user.id))
        .then(res => setSuggestions(res.data))
        .catch(() => {});

      networkAPI.getSameSchool(String(user.id))
        .then(res => setSameSchool(res.data))
        .catch(() => {});

      networkAPI.getSameCompany(String(user.id))
        .then(res => setSameCompany(res.data))
        .catch(() => {});
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
      setFollowingIds(followingIds.filter(id => id !== userId));
    } catch (err) {
      console.error('Error unfollowing user:', err);
    }
  };

  const handleConnect = async (targetUserId) => {
    try {
      await networkAPI.connect(String(user.id), String(targetUserId));
      setConnectedIds([...connectedIds, targetUserId]);
    } catch (err) {
      console.error('Error connecting:', err);
    }
  };

  return (
    <div className="network-container">
      <h2>Network</h2>

      {suggestions.length > 0 && (
        <section>
          <h3>People You May Know</h3>
          <div className="users-grid">
            {suggestions.map((s) => (
              <div key={s.user_id} className="user-card">
                <h4>{s.suggested_user}</h4>
                <button
                  onClick={() => handleConnect(s.user_id)}
                  disabled={connectedIds.includes(s.user_id)}
                  className="follow"
                >
                  {connectedIds.includes(s.user_id) ? 'Connected' : 'Connect'}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {sameSchool.length > 0 && (
        <section>
          <h3>Same School</h3>
          <div className="users-grid">
            {sameSchool.map((s) => (
              <div key={s.user_id} className="user-card">
                <h4>{s.name}</h4>
                <p className="title">{s.school}</p>
                <button
                  onClick={() => handleConnect(s.user_id)}
                  disabled={connectedIds.includes(s.user_id)}
                  className="follow"
                >
                  {connectedIds.includes(s.user_id) ? 'Connected' : 'Connect'}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {sameCompany.length > 0 && (
        <section>
          <h3>Same Company</h3>
          <div className="users-grid">
            {sameCompany.map((s) => (
              <div key={s.user_id} className="user-card">
                <h4>{s.name}</h4>
                <p className="title">{s.company}</p>
                <button
                  onClick={() => handleConnect(s.user_id)}
                  disabled={connectedIds.includes(s.user_id)}
                  className="follow"
                >
                  {connectedIds.includes(s.user_id) ? 'Connected' : 'Connect'}
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
              <img src={u.profileImage} alt={u.name} className="user-image" />
              <h4>{u.name}</h4>
              <p className="title">{u.title}</p>
              <p className="bio">{u.bio}</p>
              <button
                onClick={() => followingIds.includes(u.id) ? handleUnfollow(u.id) : handleFollow(u.id)}
                className={followingIds.includes(u.id) ? 'following' : 'follow'}
              >
                {followingIds.includes(u.id) ? 'Following' : 'Follow'}
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Network;
