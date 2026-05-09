import React, { useState, useEffect, useContext } from 'react';
import { jobAPI, companyAPI, networkAPI } from '../api';
import { AuthContext } from '../AuthContext';
import { Country, City } from 'country-state-city';
import '../styles/Jobs.css';

const Jobs = () => {
  const [jobs, setJobs] = useState([]);
  const [myCompanies, setMyCompanies] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [selectedJobApplicants, setSelectedJobApplicants] = useState(null); // { jobTitle, list }
  
  const [formData, setFormData] = useState({
    title: '',
    company_id: '',
    address: '',
    description: '',
    salaryMin: '',
    salaryMax: '',
    currency: 'USD',
    country: '',
    city: ''
  });
  const { user } = useContext(AuthContext);

  const formatSalary = (salary) => {
    if (!salary) return '';
    try {
      const s = typeof salary === 'string' ? JSON.parse(salary) : salary;
      if (s && s.min !== undefined && s.max !== undefined) {
        const minFormatted = s.min.toLocaleString('vi-VN');
        const maxFormatted = s.max.toLocaleString('vi-VN');
        return `${minFormatted} - ${maxFormatted} ${s.currency || ''}`;
      }
      return salary;
    } catch (e) {
      return salary;
    }
  };

  const fetchJobs = () => {
    jobAPI.getJobs()
      .then(res => setJobs(res.data))
      .catch(err => console.error('Error fetching jobs:', err));
  };

  useEffect(() => {
    if (!user?.id) {
      setIsDataLoading(false);
      return;
    }
    companyAPI.getMyCompanies()
      .then(res => {
        setMyCompanies(Array.isArray(res.data) ? res.data : []);
      })
      .catch(err => {
        console.error('Error fetching my companies:', err);
      })
      .finally(() => {
        setIsDataLoading(false);
      });
  }, [user?.id]);

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    if (user?.id) {
      networkAPI.getJobRecommendations(user.id)
        .then(res => setRecommendations(res.data))
        .catch(err => console.error('Error fetching recommendations:', err));
    }
  }, [user?.id]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePostJob = async (e) => {
    e.preventDefault();
    try {
      const packedData = {
        min: Number(formData.salaryMin),
        max: Number(formData.salaryMax),
        currency: formData.currency,
        address: formData.address,
        city: formData.city,
        country: formData.country,
        description: formData.description
      };

      if (editingJob) {
        await jobAPI.updateJob(editingJob.id, {
          title: formData.title,
          location: '', 
          description: '', 
          salary_range: packedData
        });
        alert('Job updated successfully!');
      } else {
        await jobAPI.createJob(
          formData.title,
          formData.company_id,
          '', 
          '', 
          packedData
        );
        alert('Job posted successfully!');
      }

      resetForm();
      fetchJobs();
    } catch (err) {
      console.error('Error handling job submission:', err);
      alert('Action failed: ' + (err.response?.data?.error || err.message));
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      company_id: '',
      address: '',
      description: '',
      salaryMin: '',
      salaryMax: '',
      currency: 'USD',
      country: '',
      city: ''
    });
    setEditingJob(null);
    setShowForm(false);
  };

  const handleEdit = (job) => {
    let extra = {};
    try { extra = typeof job.salary_range === 'string' ? JSON.parse(job.salary_range) : job.salary_range; } catch(e) {}
    
    setFormData({
      title: job.title,
      company_id: job.company_id, // Note: This might need mapping if the API returns name instead of ID
      address: extra.address || '',
      description: extra.description || job.description || '',
      salaryMin: extra.min || '',
      salaryMax: extra.max || '',
      currency: extra.currency || 'USD',
      country: extra.country || '',
      city: extra.city || ''
    });
    setEditingJob(job);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (jobId) => {
    if (!window.confirm('Are you sure you want to delete this job posting?')) return;
    try {
      await jobAPI.deleteJob(jobId);
      alert('Job deleted');
      fetchJobs();
    } catch (err) {
      alert('Delete failed');
    }
  };

  const handleViewApplicants = async (job) => {
    try {
      const res = await jobAPI.getApplicants(job.id);
      setSelectedJobApplicants({ jobTitle: job.title, list: res.data });
    } catch (err) {
      alert('Failed to load applicants');
    }
  };

  if (isDataLoading) return <div className="jobs-page"><p>Loading...</p></div>;

  return (
    <div className="jobs-page">
      <div className="jobs-container">
        <div className="jobs-header">
          <h2>Job Management</h2>
          <button className="post-job-btn" onClick={() => editingJob ? resetForm() : setShowForm(!showForm)}>
            {showForm ? 'Cancel' : '+ New Opportunity'}
          </button>
        </div>

        {showForm && (
          <form className="post-job-form premium-form" onSubmit={handlePostJob}>
            <div className="form-section">
              <h3>{editingJob ? 'Edit Job Posting' : 'Basic Info'}</h3>
              <input type="text" name="title" placeholder="Job Title" value={formData.title} onChange={handleInputChange} required />
              {!editingJob && (
                <select name="company_id" value={formData.company_id} onChange={handleInputChange} required>
                  <option value="">Select Company</option>
                  {myCompanies.map(c => (
                    <option key={c.company_id} value={c.company_id}>{c.name}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="form-section">
              <h3>Location</h3>
              <div className="form-row">
                <select name="country" value={formData.country} onChange={handleInputChange} required>
                  <option value="">Country</option>
                  {Country.getAllCountries().map(c => <option key={c.isoCode} value={c.name}>{c.name}</option>)}
                </select>
                <select name="city" value={formData.city} onChange={handleInputChange} required>
                  <option value="">City</option>
                  {(() => {
                    const countryObj = Country.getAllCountries().find(c => c.name === formData.country);
                    if (!countryObj) return null;
                    return City.getCitiesOfCountry(countryObj.isoCode).map(city => (
                      <option key={`${city.name}-${city.latitude}-${city.longitude}`} value={city.name}>
                        {city.name}
                      </option>
                    ));
                  })()}
                </select>
              </div>
              <input type="text" name="address" placeholder="Street Address" value={formData.address} onChange={handleInputChange} required />
            </div>

            <div className="form-section">
              <h3>Compensation & Details</h3>
              <div className="form-row">
                <input type="number" name="salaryMin" placeholder="Min" value={formData.salaryMin} onChange={handleInputChange} required />
                <input type="number" name="salaryMax" placeholder="Max" value={formData.salaryMax} onChange={handleInputChange} required />
                <select name="currency" value={formData.currency} onChange={handleInputChange}>
                  <option value="USD">USD</option>
                  <option value="VND">VND</option>
                </select>
              </div>
              <textarea name="description" placeholder="Description" value={formData.description} onChange={handleInputChange} required />
            </div>

            <button type="submit" className="submit-job-btn">
              {editingJob ? 'Save Changes' : 'Publish Opportunity'}
            </button>
          </form>
        )}

        {selectedJobApplicants && (
          <div className="applicants-modal-overlay" onClick={() => setSelectedJobApplicants(null)}>
            <div className="applicants-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Applicants for: {selectedJobApplicants.jobTitle}</h3>
                <button className="close-btn" onClick={() => setSelectedJobApplicants(null)}>&times;</button>
              </div>
              <div className="applicants-list">
                {selectedJobApplicants.list.length > 0 ? (
                  selectedJobApplicants.list.map(app => (
                    <div key={app.id} className="applicant-item">
                      <div className="app-info">
                        <strong>{app.full_name || 'Anonymous User'}</strong>
                        <p>{app.email}</p>
                        <span className="app-headline">{app.headline || 'Job Seeker'}</span>
                      </div>
                      <div className="app-date">
                        Applied: {new Date(app.applied_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))
                ) : <p className="empty-msg">No applicants yet.</p>}
              </div>
            </div>
          </div>
        )}

        <div className="jobs-list">
          <h3>Your Job Postings</h3>
          <div className="admin-job-grid">
            {jobs.filter(j => myCompanies.some(c => c.name === j.company_name)).map(job => {
              let extra = {};
              try { extra = typeof job.salary_range === 'string' ? JSON.parse(job.salary_range) : job.salary_range; } catch(e) {}
              const loc = extra?.address ? `${extra.address}, ${extra.city}, ${extra.country}` : (job.location || 'Remote');
              
              return (
                <div key={job.id} className="job-admin-card-v2">
                  <div className="card-top">
                    <h4>{job.title}</h4>
                    <div className="card-actions">
                      <button onClick={() => handleEdit(job)} title="Edit">✏️</button>
                      <button onClick={() => handleDelete(job.id)} title="Delete" style={{ marginLeft: '8px' }}>🗑️</button>
                    </div>
                  </div>
                  <p className="card-meta">🏢 {job.company_name}</p>
                  <p className="card-meta">📍 {loc}</p>
                  <div className="card-footer">
                    <span className="salary-tag">{formatSalary(job.salary_range)}</span>
                    <button className="app-count-btn" onClick={() => handleViewApplicants(job)}>
                      👥 {job.applicants_count || 0} applicants
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Jobs;
