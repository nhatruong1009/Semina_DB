import React, { useState, useEffect, useContext } from 'react';
import { jobAPI, networkAPI } from '../api';
import { AuthContext } from '../AuthContext';
import '../styles/Jobs.css';

const Jobs = () => {
  const [jobs, setJobs] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    company: '',
    location: '',
    description: '',
    salary: ''
  });
  const { user } = useContext(AuthContext);

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

  useEffect(() => {
    if (!user?.id) return;
    networkAPI.getJobRecommendations(String(user.id))
      .then(res => setRecommendations(res.data))
      .catch(() => {});
  }, [user?.id]);

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
    <div className="jobs-page">
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

    {recommendations.length > 0 && (
      <div className="jobs-recommendations">
        <h3>Recommended for You</h3>
        <div className="rec-list">
          {recommendations.map((rec, i) => (
            <div key={i} className="rec-card">
              <h4>{rec.job}</h4>
              {rec.salary && <p className="rec-salary">{rec.salary}</p>}
              <p className="rec-skills">{rec.matching_skills} matching skill{rec.matching_skills !== 1 ? 's' : ''}</p>
            </div>
          ))}
        </div>
      </div>
    )}
    </div>
  );
};

export default Jobs;
