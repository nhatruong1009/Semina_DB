const express = require('express');
const router = express.Router();
const { users, jobs, nextIds } = require('../data');
const { verifyToken } = require('../middleware/auth');

router.post('/create',[
    verifyToken
  ], (req, res) => {
  const { title, company, location, description, salary } = req.body;

  const newJob = {
    id: nextIds.jobs++,
    postedBy: req.userId,
    title,
    company,
    location,
    description,
    salary,
    applications: [],
    createdAt: new Date()
  };

  jobs.push(newJob);
  res.status(201).json(newJob);
});

router.get('/', (req, res) => {
  const jobsWithAuthor = jobs.map(j => ({
    ...j,
    author: users.find(u => u.id === j.postedBy)
  }));
  res.json(jobsWithAuthor);
});

router.post('/:id/apply',[
    verifyToken
  ], (req, res) => {
  const job = jobs.find(j => j.id === parseInt(req.params.id));
  if (!job) return res.status(404).json({ error: 'Job not found' });

  if (!job.applications.includes(req.userId)) {
    job.applications.push(req.userId);
  }

  res.json({ message: 'Applied to job', job });
});

module.exports = router;