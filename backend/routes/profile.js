const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const Profiles = require('../query/profiles');

// Get profile by user ID
router.get('/:userId', [verifyToken], async (req, res) => {
  try {
    let records = await Profiles.getProfileByUserId(req.params.userId);
    
    // If profile doesn't exist, try to create a skeleton one from user info
    if (!records || records.rowCount === 0) {
      console.log(`[Profile] Missing record for user ${req.params.userId}, attempting recovery...`);
      const User = require('../query/user');
      const userRecords = await User.getUserProfileById(req.params.userId);
      
      if (userRecords && userRecords.rowCount > 0) {
        const userData = userRecords.rows[0];
        console.log(`[Profile] Found user info for ${userData.email}, upserting profile...`);
        const fullName = userData.full_name || 'User';
        await Profiles.updateProfile(req.params.userId, fullName, '', '', '', '', '');
        
        // Sync with Neo4j via Kafka during recovery
        const { publishUserCreated } = require('../datadriven/data_collector');
        await publishUserCreated({
          user_id: req.params.userId,
          full_name: fullName,
          headline: '',
          location: '',
          email: userData.email
        });
        
        records = await Profiles.getProfileByUserId(req.params.userId);
      }
 else {
        console.warn(`[Profile] No user found in database for ID ${req.params.userId}`);
      }
    }


    if (!records || records.rowCount === 0) {
      return res.status(404).json({ error: 'Profile not found even after creation attempt' });
    }
    res.json(records.rows[0]);
  } catch (err) {
    console.error('Error in GET /profiles/:userId:', err);
    res.status(500).json({ error: err.message });
  }
});


// Update own profile
router.put('/me', [verifyToken], async (req, res) => {
  try {
    const { full_name, headline, bio, location, avatar_url, cover_url } = req.body;
    
    // 1. Update PostgreSQL
    const records = await Profiles.updateProfile(
      req.userId,
      full_name,
      headline,
      bio,
      location,
      avatar_url,
      cover_url
    );

    // 2. Sync with Neo4j via Kafka for social features
    const { publishUserCreated } = require('../datadriven/data_collector');
    await publishUserCreated({
      user_id: req.userId,
      full_name: full_name,
      headline: headline,
      location: location,
      email: records.rows[0].email
    });

    res.json(records.rows[0]);
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;
