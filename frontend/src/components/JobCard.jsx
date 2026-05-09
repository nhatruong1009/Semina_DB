import React, { useState, useEffect } from 'react';
import { jobAPI } from '../api';
import '../styles/PostCard.css'; 

const JobCard = ({ job }) => {
  const [applied, setApplied] = useState(job.has_applied || false);
  const [loading, setLoading] = useState(false);

  // Sync state with props when they change (e.g. after a page refresh)
  useEffect(() => {
    setApplied(job.has_applied || false);
  }, [job.has_applied]);

  // Parse packed data
  let extraData = {};
  try {
    extraData = typeof job.salary_range === 'string' ? JSON.parse(job.salary_range) : job.salary_range;
  } catch (e) {
    extraData = {};
  }

  const displayDescription = extraData?.description || job.description;
  const displayLocation = extraData?.address 
    ? `${extraData.address}${extraData.city ? ', ' + extraData.city : ''}${extraData.country ? ', ' + extraData.country : ''}`
    : (job.location || 'Remote');

  const formatSalary = (salary) => {
    const s = extraData;
    if (s && s.min !== undefined && s.max !== undefined) {
      const minFormatted = s.min.toLocaleString('vi-VN');
      const maxFormatted = s.max.toLocaleString('vi-VN');
      return `${minFormatted} - ${maxFormatted} ${s.currency || ''}`;
    }
    return typeof salary === 'string' ? salary : '';
  };

  const handleApply = async () => {
    if (!job?.id) {
      alert('Error: Job ID missing');
      return;
    }
    setLoading(true);
    try {
      await jobAPI.applyJob(job.id);
      setApplied(true);
    } catch (err) {
      console.error('Error applying to job:', err);
      alert('Failed to apply: ' + (err.response?.data?.error || err.message));
    }
    setLoading(false);
  };

  return (
    <div className="post-card job-card">
      <div className="post-header">
        <div className="author-info">
          <h3 className="job-title" style={{ fontSize: '16px', color: '#0a66c2', marginBottom: '4px' }}>
            {job.title}
          </h3>
          <p className="company-name" style={{ fontSize: '14px', fontWeight: '600' }}>
            🏢 {job.company_name}
          </p>
          <p className="job-location" style={{ fontSize: '12px', color: 'rgba(0,0,0,0.6)' }}>
            📍 {displayLocation}
          </p>
        </div>
      </div>

      <div className="post-content">
        <p style={{ fontSize: '14px', margin: '12px 0', lineHeight: '1.5' }}>{displayDescription}</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {job.salary_range && (
            <p className="salary" style={{ fontWeight: '600', color: '#057642' }}>
              💰 {formatSalary(job.salary_range)}
            </p>
          )}
          <p className="applicants" style={{ fontSize: '12px', color: '#0a66c2' }}>
            👥 {job.applicants_count || 0} applicants
          </p>
        </div>
      </div>

      <div className="post-actions-row" style={{ borderTop: '1px solid rgba(0,0,0,0.08)', paddingTop: '8px' }}>
        <button 
          className={`action-btn ${applied ? 'applied-state' : ''}`} 
          onClick={handleApply}
          disabled={applied || loading}
          style={{ 
            flex: 1, 
            color: applied ? '#057642' : '#0a66c2',
            backgroundColor: applied ? '#e8f5e9' : 'transparent',
            borderRadius: '4px',
            cursor: applied ? 'default' : 'pointer'
          }}
        >
          <span className="icon">{applied ? '✅' : '📝'}</span>
          <span className="label" style={{ fontWeight: applied ? '700' : '500' }}>
            {applied ? 'Already Applied' : 'Apply Now'}
          </span>
        </button>
      </div>
    </div>
  );
};

export default JobCard;
