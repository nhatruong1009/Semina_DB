import React, { useState, useEffect, useContext } from 'react';
import { userAPI } from '../api';
import { AuthContext } from '../AuthContext';
import '../styles/Network.css';

const Network = () => {
  const [users, setUsers] = useState([]);
  const { user } = useContext(AuthContext);
  const [followingIds, setFollowingIds] = useState(user?.following || []);

  const fetchUsers = async () => {
    try {
      const res = await userAPI.getAllUsers();
      setUsers(res.data.filter(u => u.id !== user?.id));
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleFollow = async (userId) => {
    try {
      await userAPI.follow(userId);
      setFollowingIds([...followingIds, userId]);
    } catch (err) {
      console.error('Error following user:', err);
    }
  };

  const handleUnfollow = async (userId) => {
    try {
      await userAPI.unfollow(userId);
      setFollowingIds(followingIds.filter(id => id !== userId));
    } catch (err) {
      console.error('Error unfollowing user:', err);
    }
  };

  return (
    <div className="network-container">
      <h2>Network</h2>
      <div className="users-grid">
        {users.map((u) => (
          <div key={u.id} className="user-card">
            <img src={u.profileImage} alt={u.name} className="user-image" />
            <h4>{u.name}</h4>
            <p className="title">{u.title}</p>
            <p className="bio">{u.bio}</p>
            <p className="followers">{u.followers.length} followers</p>
            <button
              onClick={() => followingIds.includes(u.id) ? handleUnfollow(u.id) : handleFollow(u.id)}
              className={followingIds.includes(u.id) ? 'following' : 'follow'}
            >
              {followingIds.includes(u.id) ? 'Following' : 'Follow'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Network;
