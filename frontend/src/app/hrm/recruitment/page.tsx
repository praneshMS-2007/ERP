'use client';

import { useState, useEffect } from 'react';
import { Plus, Users, Filter, Briefcase, FileText, CheckCircle, Clock, ArrowRight, UserCheck } from 'lucide-react';
import { hrmApi } from '../../../services/api';
import Modal, { FormField } from '../../../components/Modal';

export default function RecruitmentPage() {
  const [activeTab, setActiveTab] = useState<'applicants' | 'jobs'>('applicants');
  const [applicants, setApplicants] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [showJobModal, setShowJobModal] = useState(false);
  const [showApplicantModal, setShowApplicantModal] = useState(false);
  const [jobForm, setJobForm] = useState({ title: '', department: '', location: '', description: '', salaryRange: '' });
  const [appForm, setAppForm] = useState({ name: '', email: '', phone: '', jobId: '', resumeUrl: '' });

  async function fetchAll() {
    const [appData, jobData] = await Promise.all([hrmApi.getApplicants(), hrmApi.getJobPostings()]);
    setApplicants(Array.isArray(appData) ? appData : []);
    setJobs(Array.isArray(jobData) ? jobData : []);
  }

  useEffect(() => { fetchAll(); }, []);

  async function handleCreateJob() {
    if (!jobForm.title) return;
    await hrmApi.createJobPosting(jobForm as any);
    setShowJobModal(false);
    setJobForm({ title: '', department: '', location: '', description: '', salaryRange: '' });
    fetchAll();
  }

  async function handleAddApplicant() {
    if (!appForm.name || !appForm.jobId) return;
    await hrmApi.createApplicant(appForm as any);
    setShowApplicantModal(false);
    setAppForm({ name: '', email: '', phone: '', jobId: '', resumeUrl: '' });
    fetchAll();
  }

  async function handleAdvanceStatus(id: string, currentStatus: string) {
    const flow: Record<string, string> = { 'APPLIED': 'SCREENING', 'SCREENING': 'INTERVIEWING', 'INTERVIEWING': 'OFFERED', 'OFFERED': 'HIRED' };
    const next = flow[currentStatus];
    if (next) {
      await hrmApi.updateApplicantStatus(id, next);
      fetchAll();
    }
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>Recruitment</h1>
          <p>Manage job postings, track applicants, and streamline hiring.</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={() => setShowApplicantModal(true)}>
            <Users size={16} /> Add Applicant
          </button>
          <button className="btn btn-primary" onClick={() => setShowJobModal(true)}>
            <Plus size={16} /> New Job Posting
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '24px', borderBottom: '1px solid var(--color-border)', marginBottom: '24px' }}>
        <button onClick={() => setActiveTab('applicants')}
          style={{ padding: '0 0 12px 0', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 600, color: activeTab === 'applicants' ? 'var(--color-primary)' : 'var(--color-text-muted)', borderBottom: activeTab === 'applicants' ? '2px solid var(--color-primary)' : '2px solid transparent' }}>
          Applicant Tracking ({applicants.length})
        </button>
        <button onClick={() => setActiveTab('jobs')}
          style={{ padding: '0 0 12px 0', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 600, color: activeTab === 'jobs' ? 'var(--color-primary)' : 'var(--color-text-muted)', borderBottom: activeTab === 'jobs' ? '2px solid var(--color-primary)' : '2px solid transparent' }}>
          Active Jobs ({jobs.length})
        </button>
      </div>

      {activeTab === 'applicants' ? (
        <div className="pipeline-grid">
          {[
            { label: 'APPLIED', color: '#6b7280' }, { label: 'SCREENING', color: '#3b82f6' },
            { label: 'INTERVIEWING', color: '#f59e0b' }, { label: 'OFFERED', color: '#10b981' },
          ].map((stage) => {
            const stageApps = applicants.filter(a => a.status === stage.label);
            return (
              <div key={stage.label} className="card" style={{ background: '#f9fafb', border: 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '13px', fontWeight: 700, color: stage.color }}>{stage.label}</h3>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)' }}>{stageApps.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {stageApps.map(app => (
                    <div key={app.id} className="card" style={{ padding: '12px', border: '1px solid var(--color-border)', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>{app.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>{app.job?.title || 'No job linked'}</div>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        {app.resumeUrl && <span className="badge" style={{ fontSize: '10px', padding: '2px 6px' }}><FileText size={10} style={{ marginRight: '4px' }}/>Resume</span>}
                        <button onClick={() => handleAdvanceStatus(app.id, app.status)} className="btn btn-primary btn-sm" style={{ fontSize: '10px', padding: '2px 8px', marginLeft: 'auto' }}>
                          {app.status === 'OFFERED' ? <><UserCheck size={12} /> Hire</> : <><ArrowRight size={12} /> Advance</>}
                        </button>
                      </div>
                    </div>
                  ))}
                  {stageApps.length === 0 && <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', textAlign: 'center', padding: '12px' }}>No applicants</div>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card">
          <table className="data-table">
            <thead><tr><th>Job Title</th><th>Department</th><th>Location</th><th>Applicants</th><th>Status</th></tr></thead>
            <tbody>
              {jobs.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '20px' }}>No jobs posted yet</td></tr>
              ) : jobs.map((j) => (
                <tr key={j.id}>
                  <td style={{ fontWeight: 600 }}>{j.title}</td>
                  <td>{j.department}</td>
                  <td>{j.location}</td>
                  <td><div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Users size={14} color="var(--color-text-muted)"/> {j._count?.applicants || 0}</div></td>
                  <td><span className={`badge ${j.status === 'OPEN' ? 'badge-healthy' : ''}`}>{j.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* JOB POSTING MODAL */}
      <Modal isOpen={showJobModal} onClose={() => setShowJobModal(false)} title="Create Job Posting">
        <FormField label="Job Title" value={jobForm.title} onChange={(v) => setJobForm({ ...jobForm, title: v })} required placeholder="Senior Software Engineer" />
        <FormField label="Department" value={jobForm.department} onChange={(v) => setJobForm({ ...jobForm, department: v })} placeholder="Engineering" />
        <FormField label="Location" value={jobForm.location} onChange={(v) => setJobForm({ ...jobForm, location: v })} placeholder="Remote / Dubai" />
        <FormField label="Salary Range" value={jobForm.salaryRange} onChange={(v) => setJobForm({ ...jobForm, salaryRange: v })} placeholder="$80K - $120K" />
        <FormField label="Description" type="textarea" value={jobForm.description} onChange={(v) => setJobForm({ ...jobForm, description: v })} placeholder="Job responsibilities..." />
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button className="btn btn-secondary" onClick={() => setShowJobModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleCreateJob}>Post Job</button>
        </div>
      </Modal>

      {/* ADD APPLICANT MODAL */}
      <Modal isOpen={showApplicantModal} onClose={() => setShowApplicantModal(false)} title="Add Applicant">
        <FormField label="Full Name" value={appForm.name} onChange={(v) => setAppForm({ ...appForm, name: v })} required placeholder="Jane Doe" />
        <FormField label="Email" type="email" value={appForm.email} onChange={(v) => setAppForm({ ...appForm, email: v })} placeholder="jane@example.com" />
        <FormField label="Phone" value={appForm.phone} onChange={(v) => setAppForm({ ...appForm, phone: v })} placeholder="+1 555-0123" />
        <FormField label="Job Position" type="select" value={appForm.jobId} onChange={(v) => setAppForm({ ...appForm, jobId: v })} required
          options={jobs.map(j => ({ label: j.title, value: j.id }))} />
        <FormField label="Resume URL" value={appForm.resumeUrl} onChange={(v) => setAppForm({ ...appForm, resumeUrl: v })} placeholder="https://..." />
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button className="btn btn-secondary" onClick={() => setShowApplicantModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAddApplicant}>Add Applicant</button>
        </div>
      </Modal>
    </div>
  );
}
