'use client';

import React from 'react';
import Link from 'next/link';

export default function HRMPerformance() {
  // Preloaded demo performance records
  const reviews = [
    { id: 1, empName: 'Pranesh M S', quarter: 'Q2 2026', rating: 4.5, reviewer: 'Admin', goals: 'Complete ERP backend', review: 'Excellent progress on full-stack development' },
    { id: 2, empName: 'Akshay Kumar', quarter: 'Q2 2026', rating: 4.2, reviewer: 'Admin', goals: 'Build CRM module', review: 'Strong work on CRM integration and API design' },
    { id: 3, empName: 'Priya Sharma', quarter: 'Q2 2026', rating: 4.8, reviewer: 'Admin', goals: 'Lead UI/UX redesign', review: 'Outstanding design work, exceeded expectations' },
    { id: 4, empName: 'Rahul Singh', quarter: 'Q2 2026', rating: 3.8, reviewer: 'Admin', goals: 'DevOps pipeline', review: 'Good progress, needs improvement in documentation' },
    { id: 5, empName: 'Deepa Nair', quarter: 'Q2 2026', rating: 4.0, reviewer: 'Admin', goals: 'QA automation', review: 'Solid test coverage and bug detection' },
  ];

  const ratingColor = (r: number) => r >= 4.5 ? 'var(--green)' : r >= 3.5 ? 'var(--amber)' : 'var(--red)';

  const renderStars = (rating: number) => {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    return (
      <span style={{ color: ratingColor(rating), fontSize: '14px' }}>
        {'★'.repeat(full)}{half ? '½' : ''}{'☆'.repeat(empty)}
      </span>
    );
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Performance Tracking</h1>
          <p>Employee evaluations and performance ratings</p>
        </div>
        <div className="page-actions">
          <Link href="/hrm" className="btn btn-secondary btn-sm">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" style={{marginRight: '4px'}}><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Back to HR
          </Link>
          <button className="btn btn-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Review
          </button>
        </div>
      </div>

      <div className="table-card fade-in">
        <div className="table-toolbar">
          <div className="table-title">Performance Reviews ({reviews.length})</div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Quarter</th>
              <th>Rating</th>
              <th>Goals</th>
              <th>Review</th>
              <th>Reviewer</th>
            </tr>
          </thead>
          <tbody>
            {reviews.map((r) => (
              <tr key={r.id}>
                <td style={{fontWeight: 600}}>{r.empName}</td>
                <td>{r.quarter}</td>
                <td>
                  <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                    {renderStars(r.rating)}
                    <span style={{ fontWeight: 600, color: ratingColor(r.rating) }}>{r.rating}</span>
                  </div>
                </td>
                <td style={{maxWidth: '180px'}}>{r.goals}</td>
                <td style={{maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis'}}>{r.review}</td>
                <td>{r.reviewer}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
