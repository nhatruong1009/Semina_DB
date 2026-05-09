import React, { useState, useEffect, useContext } from 'react';
import { jobAPI, networkAPI, companyAPI } from '../api';
import { AuthContext } from '../AuthContext';
import { Country, City } from 'country-state-city';
import JobCard from './JobCard';
import '../styles/Jobs.css';

const Jobs = () => {
  const [myJobs, setMyJobs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentJobId, setCurrentJobId] = useState(null);
  
  const [formData, setFormData] = useState({
    title: '',
    company: '',
    country: '',
    city: '',
    description: '',
    salaryMin: '',
    salaryMax: '',
    currency: 'USD'
  });

  const [myCompanies, setMyCompanies] = useState([]);
  const [applicants, setApplicants] = useState([]);
  const [showApplicantsModal, setShowApplicantsModal] = useState(false);
  const [selectedJobTitle, setSelectedJobTitle] = useState('');

  const { user } = useContext(AuthContext);

  useEffect(() => {
    if (user?.id) {
      fetchMyCompanies();
      fetchMyJobs();
    }
  }, [user?.id]);

  const fetchMyJobs = async () => {
    try {
      const res = await jobAPI.getMyJobs();
      setMyJobs(res.data);
    } catch (err) {
      console.error('Error fetching my jobs:', err);
    }
  };

  const fetchMyCompanies = () => {
    companyAPI.getMyCompanies()
      .then(res => setMyCompanies(res.data))
      .catch(err => console.error('Error fetching my companies:', err));
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePostJob = async (e) => {
    e.preventDefault();
    try {
      const location = `${formData.city}, ${formData.country}`;
      const salaryRange = {
        min: Number(formData.salaryMin),
        max: Number(formData.salaryMax),
        currency: formData.currency
      };

      if (isEditing) {
        await jobAPI.updateJob(currentJobId, formData.title, location, formData.description, salaryRange);
      } else {
        await jobAPI.createJob(formData.title, formData.company, location, formData.description, salaryRange);
      }

      resetForm();
      fetchMyJobs();
    } catch (err) {
      console.error('Error posting job:', err);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      company: '',
      country: '',
      city: '',
      description: '',
      salaryMin: '',
      salaryMax: '',
      currency: 'USD'
    });
    setShowForm(false);
    setIsEditing(false);
    setCurrentJobId(null);
  };

  const handleEdit = (job) => {
    const [city, country] = (job.location || '').split(', ').map(s => s.trim());
    setFormData({
      title: job.title,
      company: job.company_id,
      country: country || '',
      city: city || '',
      description: job.description || '',
      salaryMin: job.salary_range?.min || '',
      salaryMax: job.salary_range?.max || '',
      currency: job.salary_range?.currency || 'USD'
    });
    setCurrentJobId(job.id);
    setIsEditing(true);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (jobId) => {
    if (window.confirm('Are you sure you want to delete this job?')) {
      try {
        await jobAPI.deleteJob(jobId);
        fetchMyJobs();
      } catch (err) {
        console.error('Delete failed:', err);
      }
    }
  };

  const handleViewApplicants = async (jobId) => {
    try {
      const res = await jobAPI.getJobApplicants(jobId);
      setApplicants(res.data);
      const job = myJobs.find(j => j.id === jobId);
      setSelectedJobTitle(job?.title || 'Job');
      setShowApplicantsModal(true);
    } catch (err) {
      console.error('Error fetching applicants:', err);
    }
  };

  return (
    <div className="jobs-page management-only">
      <div className="jobs-container">
        <div className="section-header">
          <h2>💼 Job Management</h2>
          <button onClick={() => { if(showForm) resetForm(); else setShowForm(true); }} className="post-job-btn">
            {showForm ? 'Cancel' : '+ Post a Job'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handlePostJob} className="job-form animate-in">
            <h3>{isEditing ? 'Edit Job' : 'Post a New Job'}</h3>
            <div className="form-group">
              <label>Job Title</label>
              <input type="text" name="title" value={formData.title} placeholder="e.g. Senior React Developer" onChange={handleInputChange} required />
            </div>
            
            {!isEditing && (
              <div className="form-group">
                <label>Company</label>
                <select name="company" value={formData.company} onChange={handleInputChange} required>
                  <option value="">Select Company</option>
                  {myCompanies.map((c) => (
                    <option key={c.company_id} value={c.company_id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label>Country</label>
                <select name="country" value={formData.country} onChange={handleInputChange} required>
                  <option value="">Select Country</option>
                  {Country.getAllCountries().map((c) => (
                    <option key={c.isoCode} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              {formData.country && (
                <div className="form-group">
                  <label>City</label>
                  <select name="city" value={formData.city} onChange={handleInputChange} required>
                    <option value="">Select City</option>
                    {City.getCitiesOfCountry(
                      Country.getAllCountries().find(c => c.name === formData.country)?.isoCode
                    ).map((city) => (
                      <option key={city.name} value={city.name}>{city.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea name="description" value={formData.description} placeholder="Describe the role, requirements, and benefits..." onChange={handleInputChange} required />
            </div>

            <div className="form-group">
              <label>Salary Range (Optional)</label>
              <div className="salary-inputs-wrapper">
                <div className="salary-input-field">
                  <input type="number" name="salaryMin" value={formData.salaryMin} placeholder="Min (e.g. 10000000)" onChange={handleInputChange} />
                  <span className="input-helper">{formData.salaryMin >= 1000000 ? `≈ ${(formData.salaryMin / 1000000).toFixed(1)}tr` : ''}</span>
                </div>
                <span className="separator">to</span>
                <div className="salary-input-field">
                  <input type="number" name="salaryMax" value={formData.salaryMax} placeholder="Max (e.g. 15000000)" onChange={handleInputChange} />
                  <span className="input-helper">{formData.salaryMax >= 1000000 ? `≈ ${(formData.salaryMax / 1000000).toFixed(1)}tr` : ''}</span>
                </div>
                <select name="currency" value={formData.currency} className="currency-select" onChange={handleInputChange}>
                  <option value="VND">VND</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
            </div>


            <div className="form-actions">
              <button type="button" className="cancel-btn" onClick={resetForm}>Cancel</button>
              <button type="submit" className="submit-btn">{isEditing ? 'Update Job' : 'Post Job'}</button>
            </div>
          </form>
        )}

        <div className="jobs-list">
          {myJobs.length > 0 ? (
            myJobs.map(job => (
              <JobCard 
                key={job.id} 
                job={job} 
                isAdmin={true}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onViewApplicants={handleViewApplicants}
              />
            ))
          ) : (
            <p className="empty-msg">You haven't posted any jobs yet.</p>
          )}
        </div>
      </div>

      {/* Applicants Modal */}
      {showApplicantsModal && (
        <div className="modal-overlay" onClick={() => setShowApplicantsModal(false)}>
          <div className="modal-content animate-pop" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Applicants for: {selectedJobTitle}</h3>
              <button className="close-btn" onClick={() => setShowApplicantsModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              {applicants.length > 0 ? (
                <div className="applicants-list">
                  {applicants.map(app => (
                    <div key={app.application_id} className="applicant-item">
                      <div className="app-avatar">
                        {app.full_name?.charAt(0) || '?'}
                      </div>
                      <div className="app-info">
                        <h4>{app.full_name || 'Anonymous'}</h4>
                        <p className="app-headline">{app.headline || 'No headline'}</p>
                        <p className="app-meta">📧 {app.email} | 📍 {app.user_location || 'Remote'}</p>
                        <p className="app-date">Applied on: {new Date(app.applied_at).toLocaleDateString()}</p>
                      </div>
                      <div className="app-status">
                        <span className={`status-badge ${app.application_status.toLowerCase()}`}>
                          {app.application_status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-msg">No one has applied to this job yet.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


export default Jobs;

