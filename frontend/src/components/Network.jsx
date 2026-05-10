import React, { useState, useEffect, useContext } from 'react';
import { userAPI, networkAPI } from '../api';
import { AuthContext } from '../AuthContext';
import '../styles/Network.css';

const Network = () => {
  const [users, setUsers] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [mutuals, setMutuals] = useState({});
  const { user } = useContext(AuthContext);
  const [followingIds, setFollowingIds] = useState(user?.following || []);
  const [connectedIds, setConnectedIds] = useState([]);

  const RELATION_LABEL = {
    friend: 'Mutual friend',
    same_school: 'Same school',
    same_company: 'Same company',
    popular: 'Popular',
  };

  useEffect(() => {
    userAPI.getAllUsers()
      .then(res => setUsers(res.data.filter(u => u.id !== user?.id)))
      .catch(err => console.error('Error fetching users:', err));

    if (user?.id) {
      networkAPI.getSuggestionsAll(String(user.id))
        .then(res => setSuggestions(res.data))
        .catch(() => {});

      // Fetch real following list from Neo4j
      networkAPI.getFollowing(String(user.id))
        .then(res => {
          const ids = res.data.map(item => item.user_id);
          setFollowingIds(ids);
        })
        .catch(err => console.error('Error fetching following list:', err));
    }
  }, [user?.id]);


  useEffect(() => {
    if (!user?.id || suggestions.length === 0) return;
    suggestions
      .filter(s => s.relation === 'friend')
      .forEach(s => {
        networkAPI.getMutual(String(user.id), String(s.user_id))
          .then(res => {
            if (res.data.length > 0)
              setMutuals(prev => ({ ...prev, [s.user_id]: res.data }));
          })
          .catch(() => {});
      });
  }, [suggestions]);

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
      await Promise.all([
        networkAPI.connect(String(user.id), String(targetUserId)),
        networkAPI.follow(String(user.id), String(targetUserId)),
      ]);
      setConnectedIds([...connectedIds, targetUserId]);
      setFollowingIds([...followingIds, targetUserId]);
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
                <h4>{s.name}</h4>
                {s.headline && <p className="title">{s.headline}</p>}
                <p className="relation-badge">{RELATION_LABEL[s.relation] || s.relation}</p>
                {mutuals[s.user_id]?.length > 0 && (
                  <p className="mutual-count">
                    {mutuals[s.user_id].length} mutual connection{mutuals[s.user_id].length > 1 ? 's' : ''}
                  </p>
                )}
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
              <h4>{u.full_name || u.name}</h4>
              <p className="title">{u.headline || u.title}</p>
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
