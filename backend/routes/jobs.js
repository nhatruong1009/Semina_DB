const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');

router.post('/create', [verifyToken], (req, res) => {
  // TODO: Persist a new job posting in the database.
  // - Use req.userId as the posting user.
  // - Store title, company, location, description, salary, and createdAt.
  // - Return the created job record.
  res.status(501).json({ message: 'Job creation should be handled by the data layer and return the new job.' });
});

router.get('/', (req, res) => {
  // TODO: Query all jobs from the database and include author info.
  // - Join with user data to return author details per job.
  res.status(501).json({ message: 'Job list retrieval should be handled by the data layer and return jobs with author metadata.' });
});

router.post('/:id/apply', [verifyToken], (req, res) => {
  // TODO: Add the current user as an applicant for the specified job.
  // - Validate that the job exists.
  // - Update the job application list in the database.
  // - Return the updated job or an appropriate error if not found.
  res.status(501).json({ message: 'Job application should be handled by the data layer and return the updated job.' });
});

module.exports = router;