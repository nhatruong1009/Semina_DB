import React from 'react';
import '../styles/JobCard.css';

const JobCard = ({ job, onApply, isApplied, isAdmin, onEdit, onDelete, onViewApplicants, onViewDetails, currentUserId }) => {
  const formatCurrency = (amount, currency) => {
    if (amount === undefined || amount === null) return '0';
    
    // For VND, if it's in millions, format as "X triệu"
    if (currency === 'VND' && amount >= 1000000) {
      const millions = amount / 1000000;
      return Number.isInteger(millions) ? `${millions}tr` : `${millions.toFixed(1)}tr`;
    }
    
    return new Intl.NumberFormat('vi-VN').format(amount);
  };

  const getSalaryDisplay = () => {
    let range = job.salary_range;

    // Handle null/undefined
    if (!range) return 'Competitive';

    // If it's a string, try to parse it
    if (typeof range === 'string') {
      try {
        range = JSON.parse(range);
      } catch (e) {
        // Not JSON, return as is
        return range || 'Competitive';
      }
    }

    // Now we should have an object
    if (range && typeof range === 'object') {
      // Sometimes data might be nested or have different keys
      const min = range.min ?? range.salaryMin;
      const max = range.max ?? range.salaryMax;
      const curr = range.currency || range.salaryCurrency || 'VND';
      
      // Check if we have at least min or max
      if (min !== undefined && min !== null && max !== undefined && max !== null) {
        const minStr = formatCurrency(min, curr);
        const maxStr = formatCurrency(max, curr);
        return `${minStr} - ${maxStr} ${curr}`;
      } else if (min !== undefined && min !== null) {
        return `From ${formatCurrency(min, curr)} ${curr}`;
      } else if (max !== undefined && max !== null) {
        return `Up to ${formatCurrency(max, curr)} ${curr}`;
      }
      
      // Fallback if it's an object but doesn't match our keys
      if (range.text) return range.text;
      return 'Competitive';
    }
    
    return String(range) || 'Competitive';
  };



  const salary = getSalaryDisplay();
  
  console.log('[DEBUG JobCard]', { 
    title: job.title, 
    currentUserId, 
    recruiter_id: job.recruiter_id, 
    match: String(currentUserId) === String(job.recruiter_id) 
  });

  return (
    <div className="job-card premium-card">
      <div className="job-card-main">
        <div className="job-card-left">
          <div className="company-logo-placeholder">
            {(job.company_name || job.company || '?').charAt(0).toUpperCase()}
          </div>
        </div>
        
        <div className="job-card-center">
          <div className="job-card-header-row">
            <h3 className="job-title-text">{job.title}</h3>
            {isAdmin && (
              <div className="job-admin-actions">
                <button className="icon-btn edit-btn" onClick={() => onEdit(job)} title="Edit">✏️</button>
                <button className="icon-btn delete-btn" onClick={() => onDelete(job.id)} title="Delete">🗑️</button>
              </div>
            )}
          </div>
          
          <p className="company-name-text">{job.company_name || job.company}</p>
          
          <div className="job-metadata-row">
            <span className="meta-badge location-badge">📍 {job.location}</span>
            {salary && <span className="meta-badge salary-badge">💰 {salary}</span>}
          </div>

          <div className="job-description-container">
            <p className="job-description-text">{job.description}</p>
          </div>

          {job.required_skills_list?.length > 0 && (
            <div className="job-skills-container">
              <p className="skills-label">Required Skills:</p>
              <div className="job-skills-row">
                {job.required_skills_list.map(s => (
                  <span key={s} className="skill-tag skill-tag-sm">{s}</span>
                ))}
              </div>
            </div>
          )}

          <div className="job-stats-row">
            <span className="applicant-count-badge">
              <span className="count-number">{job.applicants_count ?? 0}</span> applicants
            </span>
            {job.matching_skills > 0 && (
              <span className="meta-badge matching-badge">
                {job.matching_skills} matching skills
              </span>
            )}
            <span className="posted-date">
              Posted on {new Date(job.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      <div className="job-card-footer-action">
        {isAdmin ? (
          <button 
            className="view-applicants-btn-full" 
            onClick={() => onViewApplicants(job.id)}
          >
            📋 View Detailed Applicants
          </button>
        ) : (
          <div className="job-card-actions-row">
            <button
              onClick={() => onViewDetails && onViewDetails(job)}
              className="view-details-btn-premium"
            >
              View Details
            </button>
            <button
              onClick={() => onApply(job.id)}
              className={`apply-btn-premium ${isApplied ? 'applied-state' : ''}`}
              disabled={isApplied}
            >
              {isApplied ? '✓ Already Applied' : 'Apply Now'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};


export default JobCard;
