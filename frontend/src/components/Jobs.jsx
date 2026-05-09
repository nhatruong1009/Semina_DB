import React, { useState, useEffect, useContext } from 'react';
import { jobAPI, networkAPI, companyAPI  } from '../api';
import { AuthContext } from '../AuthContext';
import { Country, City } from 'country-state-city';   // <-- dataset package
import '../styles/Jobs.css';

const Jobs = () => {
  const [jobs, setJobs] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [showForm, setShowForm] = useState(false);
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
  const [myCompanies, setMyCompanies] = useState([])
  const { user } = useContext(AuthContext);

  // fetch company
  useEffect(() => {
  if (!user?.id) return;
    companyAPI.getMyCompanies()
      .then(res => setMyCompanies(res.data))
      .catch(err => console.error('Error fetching my companies:', err));
  }, [user?.id]);

  // Fetch jobs
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

  const handleApply = async (jobId) => {
    try {
      await jobAPI.applyJob(jobId);
      alert('Applied successfully!');
    } catch (err) {
      alert(err.response?.data?.error || 'Apply failed');
    }
  };

  const handlePostJob = async (e) => {
    e.preventDefault();
    try {
      await jobAPI.createJob(
        formData.title,
        formData.company,
        `${formData.city}, ${formData.country}`,   // combine city + country
        formData.description,
        {
          min: Number(formData.salaryMin),
          max: Number(formData.salaryMax),
          currency: formData.currency
        }
      );
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
      fetchJobs();
    } catch (err) {
      console.error('Error posting job:', err);
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
            {/* Company dropdown */}
            <select
              name="company"
              value={formData.company}
              onChange={handleInputChange}
              required
            >
              <option value="">Select Company</option>
              {myCompanies.map((c) => (
                <option key={c.company_id} value={c.company_id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Country dropdown */}
            <select
              name="country"
              value={formData.country}
              onChange={handleInputChange}
              required
            >
              <option value="">Select Country</option>
              {Country.getAllCountries().map((c) => (
                <option key={c.isoCode} value={c.name}>{c.name}</option>
              ))}
            </select>

            {/* City dropdown (depends on country) */}
            {formData.country && (
              <select
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                required
              >
                <option value="">Select City</option>
                {City.getCitiesOfCountry(
                  Country.getAllCountries().find(c => c.name === formData.country)?.isoCode
                ).map((city) => (
                  <option key={city.name} value={city.name}>{city.name}</option>
                ))}
              </select>
            )}

            <textarea name="description" placeholder="Description" onChange={handleInputChange} required />

            {/* Salary range */}
            <div className="salary-range">
              <input type="number" name="salaryMin" placeholder="Salary From" onChange={handleInputChange} required />
              <input type="number" name="salaryMax" placeholder="Up To" onChange={handleInputChange} required />
              <select name="currency" onChange={handleInputChange}>
                <option value="USD">USD</option>
                <option value="VND">VND</option>
                <option value="EUR">EUR</option>
                <option value="JPY">JPY</option>
              </select>
            </div>

            <button type="submit">Post Job</button>
          </form>
        )}

        {/* Jobs list */}
        <div className="jobs-list">
          {jobs.map((job) => {
            const salary = typeof job.salary_range === 'object' && job.salary_range !== null
              ? `${job.salary_range.min} - ${job.salary_range.max} ${job.salary_range.currency}`
              : (job.salary_range || '');
            return (
              <div key={job.id} className="job-card">
                <h3>{job.title}</h3>
                <p className="company">{job.company_name || job.company}</p>
                <p className="location">{job.location}</p>
                {salary && <p className="salary">{salary}</p>}
                <p>{job.description}</p>
                <p className="applicants">{job.applicants_count ?? (job.applications?.length ?? 0)} applicants</p>
                <button onClick={() => handleApply(job.id)} className="apply-btn">
                  Apply Now
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="jobs-recommendations">
          <h3>Recommended for You</h3>
          <div className="rec-list">
            {recommendations.map((rec, i) => (
              <div key={i} className="rec-card">
                <h4>{rec.job}</h4>
                {rec.salary && <p className="rec-salary">{rec.salary}</p>}
                <p className="rec-skills">
                  {rec.matching_skills} matching skill{rec.matching_skills !== 1 ? 's' : ''}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Jobs;
