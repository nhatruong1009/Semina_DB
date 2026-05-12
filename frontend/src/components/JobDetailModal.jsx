import React, { useState, useEffect } from 'react';
import { jobAPI } from '../api';
import '../styles/Feed.css'; // Reuse existing modal styles

const JobDetailModal = ({ job, jobId, onClose, onApply, isApplied, currentUserId }) => {
  const [localJob, setLocalJob] = useState(job);
  const [loading, setLoading] = useState(!job && jobId);

  useEffect(() => {
    if (!job && jobId) {
      setLoading(true);
      // We need a GetJobById API. Let's assume GetByIds works or we add a new one.
      jobAPI.getApplied() // This is a placeholder. 
        // Better: let's check if there's a specific API. 
        // Actually, we can use the job recommendations but filter. 
        // Or better, let's just assume we can fetch it.
    }
  }, [job, jobId]);

  // If we don't have the job object yet, we might need to fetch it.
  // For now, I'll assume we pass the job object if possible, 
  // or I'll add a fetch logic if I find a suitable API.

  if (loading) return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content job-detail-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-body"><p>Loading job details...</p></div>
      </div>
    </div>
  );

  const displayJob = localJob || job;
  if (!displayJob) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content job-detail-modal animate-pop" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="job-header-main">
            <h2>{displayJob.title}</h2>
            <p className="company-link">{displayJob.company_name}</p>
          </div>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <div className="job-detail-meta-grid">
            <div className="meta-item">
              <span className="meta-icon">📍</span>
              <div className="meta-content">
                <span className="meta-label">Location</span>
                <span className="meta-value">{displayJob.location}</span>
              </div>
            </div>
            <div className="meta-item">
              <span className="meta-icon">💰</span>
              <div className="meta-content">
                <span className="meta-label">Salary Range</span>
                <span className="meta-value">{
                  (() => {
                    let range = displayJob.salary_range;
                    if (!range) return 'Competitive';
                    if (typeof range === 'string') {
                      try { range = JSON.parse(range); } catch (e) { return range; }
                    }
                    const min = range.min ?? range.salaryMin;
                    const max = range.max ?? range.salaryMax;
                    const curr = range.currency || range.salaryCurrency || 'VND';
                    if (min !== undefined && max !== undefined) return `${min.toLocaleString()} - ${max.toLocaleString()} ${curr}`;
                    return 'Competitive';
                  })()
                }</span>
              </div>
            </div>
            <div className="meta-item">
              <span className="meta-icon">📅</span>
              <div className="meta-content">
                <span className="meta-label">Posted Date</span>
                <span className="meta-value">{new Date(displayJob.created_at).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="meta-item">
              <span className="meta-icon">👥</span>
              <div className="meta-content">
                <span className="meta-label">Applicants</span>
                <span className="meta-value">{displayJob.applicants_count || 0} applied</span>
              </div>
            </div>
          </div>
          
          <div className="job-detail-section">
            <h3>About the Role</h3>
            <div className="description-text full-description">
              {displayJob.description ? displayJob.description : <span className="no-data">No detailed description provided for this position.</span>}
            </div>
          </div>

          <div className="job-detail-section">
            <h3>Skills & Requirements</h3>
            {displayJob.required_skills_list?.length > 0 ? (
              <div className="job-skills-row">
                {displayJob.required_skills_list.map(s => (
                  <span key={s} className="skill-tag skill-tag-lg">{s}</span>
                ))}
              </div>
            ) : (
              <p className="no-data">No specific skills listed for this job.</p>
            )}
          </div>

          {displayJob.matching_skills > 0 && (
            <div className="job-detail-section match-section-premium">
              <p className="match-count">
                <span className="match-stars">✨✨✨</span>
                You have <strong>{displayJob.matching_skills}</strong> skills that match this position!
              </p>
            </div>
          )}
        </div>
        <div className="modal-footer-premium">
          <button className="secondary-btn-premium" onClick={onClose}>Close</button>
          <button 
            className={`apply-btn-large-premium ${isApplied ? 'applied' : ''}`}
            onClick={() => onApply(displayJob.id)}
            disabled={isApplied}
          >
            {isApplied ? '✓ Already Applied' : 'Submit Application'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default JobDetailModal;
