'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { hrmApi } from '../../../services/api';
import Modal from '../../../components/Modal';

export default function HRMPerformance() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    employeeId: '',
    reviewerId: '',
    quarter: 'Q2 2026',
    rating: '4.5',
    goals: '',
    review: '',
  });

  async function loadData() {
    setLoading(true);
    try {
      const [revData, empData] = await Promise.all([
        hrmApi.getPerformanceReviews(),
        hrmApi.getEmployees(),
      ]);
      if (Array.isArray(revData)) setReviews(revData);
      if (Array.isArray(empData)) setEmployees(empData);
    } catch (e) {
      console.error('Failed to load performance data', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleAddReview(e: React.FormEvent) {
    e.preventDefault();
    if (!form.employeeId || !form.review) {
      alert('Please select an employee and provide a review.');
      return;
    }
    const reviewerId = form.reviewerId || (employees.length > 0 ? employees[0].id : form.employeeId);

    try {
      await hrmApi.createPerformanceReview({
        employeeId: form.employeeId,
        reviewerId,
        quarter: form.quarter,
        rating: parseFloat(form.rating) || 4.5,
        goals: form.goals,
        review: form.review,
      });
      setShowModal(false);
      setForm({ employeeId: '', reviewerId: '', quarter: 'Q2 2026', rating: '4.5', goals: '', review: '' });
      loadData();
    } catch (e) {
      console.error('Failed to create review', e);
    }
  }

  const ratingColor = (r: number) => r >= 4.5 ? 'var(--green)' : r >= 3.5 ? 'var(--amber)' : 'var(--red)';

  const renderStars = (rating: number) => {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5 ? 1 : 0;
    const empty = Math.max(0, 5 - full - half);
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
          <p>Employee evaluations and performance ratings (Live PostgreSQL Audit)</p>
        </div>
        <div className="page-actions">
          <Link href="/hrm" className="btn btn-secondary btn-sm">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" style={{marginRight: '4px'}}><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Back to HR
          </Link>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Review
          </button>
        </div>
      </div>

      <div className="table-card fade-in">
        <div className="table-toolbar">
          <div className="table-title">Performance Reviews ({reviews.length})</div>
        </div>
        {loading ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading performance reviews...</div>
        ) : (
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
                  <td style={{fontWeight: 600}}>
                    {r.employee ? `${r.employee.firstName} ${r.employee.lastName}` : (r.empName || 'Employee')}
                  </td>
                  <td>{r.quarter}</td>
                  <td>
                    <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                      {renderStars(r.rating || 4.5)}
                      <span style={{ fontWeight: 600, color: ratingColor(r.rating || 4.5) }}>{r.rating}</span>
                    </div>
                  </td>
                  <td style={{maxWidth: '180px'}}>{r.goals || '—'}</td>
                  <td style={{maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis'}}>{r.review}</td>
                  <td>{r.reviewer ? `${r.reviewer.firstName} ${r.reviewer.lastName}` : 'Manager'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        isOpen={showModal}
        title="Add Performance Review"
        onClose={() => setShowModal(false)}
      >
        <form onSubmit={handleAddReview}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Employee *</label>
            <select
              className="form-control"
              value={form.employeeId}
              onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
              required
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-background)' }}
            >
              <option value="">Select Employee...</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.firstName} {e.lastName} ({e.empCode})
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Quarter</label>
            <input
              className="form-control"
              value={form.quarter}
              onChange={(e) => setForm({ ...form, quarter: e.target.value })}
              placeholder="e.g. Q2 2026"
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-background)' }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Rating (1.0 to 5.0)</label>
            <input
              className="form-control"
              type="number"
              step="0.1"
              min="1"
              max="5"
              value={form.rating}
              onChange={(e) => setForm({ ...form, rating: e.target.value })}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-background)' }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Goals</label>
            <input
              className="form-control"
              value={form.goals}
              onChange={(e) => setForm({ ...form, goals: e.target.value })}
              placeholder="Key quarterly objectives"
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-background)' }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Review Details *</label>
            <textarea
              className="form-control"
              rows={3}
              value={form.review}
              onChange={(e) => setForm({ ...form, review: e.target.value })}
              placeholder="Detailed evaluation comments..."
              required
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-background)' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save Review</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
