import React, { useState, useEffect } from 'react';
import { jobAPI } from '../api';
import '../styles/Jobs.css';

const Jobs = () => {
  const [jobs, setJobs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    company: '',
    location: '',
    description: '',
    salary: ''
  });

  const fetchJobs = async () => {
    try {
      const res = await jobAPI.getJobs();
      setJobs(res.data);
    } catch (err) {
      console.error('Error fetching jobs:', err);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePostJob = async (e) => {
    e.preventDefault();
    try {
      await jobAPI.createJob(
        formData.title,
        formData.company,
        formData.location,
        formData.description,
        formData.salary
      );
      setFormData({ title: '', company: '', location: '', description: '', salary: '' });
      setShowForm(false);
      fetchJobs();
    } catch (err) {
      console.error('Error posting job:', err);
    }
  };

  const handleApply = async (jobId) => {
    try {
      await jobAPI.applyJob(jobId);
      fetchJobs();
      alert('Applied to job!');
    } catch (err) {
      console.error('Error applying to job:', err);
    }
  };

  return (
    <div className="jobs-container">
      <h2>Jobs</h2>
      <button onClick={() => setShowForm(!showForm)} className="post-job-btn">
        {showForm ? 'Cancel' : 'Post a Job'}
      </button>

      {showForm && (
        <form onSubmit={handlePostJob} className="job-form">
          <input type="text" name="title" placeholder="Job Title" onChange={handleInputChange} required />
          <input type="text" name="company" placeholder="Company" onChange={handleInputChange} required />
          <input type="text" name="location" placeholder="Location" onChange={handleInputChange} required />
          <textarea name="description" placeholder="Description" onChange={handleInputChange} required />
          <input type="text" name="salary" placeholder="Salary" onChange={handleInputChange} required />
          <button type="submit">Post Job</button>
        </form>
      )}

      <div className="jobs-list">
        {jobs.map((job) => (
          <div key={job.id} className="job-card">
            <h3>{job.title}</h3>
            <p className="company">{job.company}</p>
            <p className="location">📍 {job.location}</p>
            <p className="salary">💰 {job.salary}</p>
            <p>{job.description}</p>
            <p className="applicants">{job.applications.length} applicants</p>
            <button onClick={() => handleApply(job.id)} className="apply-btn">
              Apply Now
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Jobs;
