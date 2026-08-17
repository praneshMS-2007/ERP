'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Upload, X, Megaphone } from 'lucide-react';
import { announcementApi, uploadApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Modal, { FormField } from '../../components/Modal';

function recipientLabel(u: any) {
  if (u.employee) return `${u.employee.firstName} ${u.employee.lastName}`;
  return u.username || u.email || 'Unknown';
}

export default function AnnouncementsPage() {
  const { user } = useAuth();
  const canCompose = !!user && user.role !== 'EMPLOYEE';

  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [recipientOptions, setRecipientOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showCompose, setShowCompose] = useState(false);
  const [form, setForm] = useState({ title: '', body: '' });
  const [audience, setAudience] = useState<'ALL' | 'SPECIFIC'>('ALL');
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [file, setFile] = useState<{ url: string; name: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [composeError, setComposeError] = useState('');
  const feedEndRef = useRef<HTMLDivElement>(null);

  async function fetchData() {
    try {
      const data = await announcementApi.getAnnouncements();
      setAnnouncements(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message || 'Could not load announcements.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { feedEndRef.current?.scrollIntoView({ block: 'nearest' }); }, [announcements.length]);

  function openCompose() {
    setForm({ title: '', body: '' });
    setAudience('ALL');
    setSelectedRecipients([]);
    setFile(null);
    setComposeError('');
    if (recipientOptions.length === 0) {
      announcementApi.getRecipientOptions().then((data) => setRecipientOptions(Array.isArray(data) ? data : [])).catch(() => {});
    }
    setShowCompose(true);
  }

  async function handleFile(f: File) {
    setUploading(true);
    try {
      const res = await uploadApi.uploadFile(f);
      setFile({ url: res.url, name: f.name });
    } catch (e: any) {
      setComposeError(e.message || 'File upload failed.');
    } finally {
      setUploading(false);
    }
  }

  function toggleRecipient(id: string) {
    setSelectedRecipients((prev) => prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]);
  }

  async function handlePost() {
    if (!form.title.trim() || !form.body.trim()) {
      setComposeError('A title and message are both required.');
      return;
    }
    if (audience === 'SPECIFIC' && selectedRecipients.length === 0) {
      setComposeError('Select at least one recipient, or choose Everyone.');
      return;
    }
    try {
      await announcementApi.createAnnouncement({
        title: form.title, body: form.body,
        fileUrl: file?.url, fileName: file?.name,
        isBroadcast: audience === 'ALL',
        recipientUserIds: audience === 'SPECIFIC' ? selectedRecipients : undefined,
      });
      setShowCompose(false);
      fetchData();
    } catch (e: any) {
      setComposeError(e.message || 'Could not post this announcement.');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this message?')) return;
    try {
      await announcementApi.deleteAnnouncement(id);
      fetchData();
    } catch (e: any) {
      alert(e.message || 'Could not delete this message.');
    }
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>Announcements</h1>
          <p>Company-wide messages from management — visible to every account.</p>
        </div>
        {canCompose && (
          <div className="page-header-actions">
            <button className="btn btn-primary" onClick={openCompose}>
              <Plus size={16} /> New Announcement
            </button>
          </div>
        )}
      </div>

      {error && (
        <div style={{ padding: '10px 14px', marginBottom: 14, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>{error}</div>
      )}

      <div className="card">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minHeight: '200px', maxHeight: '640px', overflowY: 'auto', paddingRight: '4px' }}>
          {loading ? (
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', textAlign: 'center', padding: '30px 0' }}>Loading…</p>
          ) : announcements.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-muted)' }}>
              <Megaphone size={28} style={{ opacity: 0.4, marginBottom: '8px' }} />
              <p style={{ fontSize: '13px' }}>Nothing posted yet.</p>
            </div>
          ) : announcements.map((a: any) => {
            const isMine = a.authorUserId === user?.id;
            return (
              <div key={a.id} style={{
                alignSelf: isMine ? 'flex-end' : 'flex-start', maxWidth: '70%',
                padding: '10px 14px', borderRadius: '12px',
                background: a.isBroadcast ? 'var(--color-background)' : '#ede9fe',
                border: '1px solid var(--color-border)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'baseline' }}>
                  <span style={{ fontWeight: 700, fontSize: '13.5px' }}>{a.title}</span>
                  {(isMine || user?.role === 'SUPER_ADMIN') && (
                    <button onClick={() => handleDelete(a.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}><Trash2 size={13} /></button>
                  )}
                </div>
                <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '4px 0', whiteSpace: 'pre-wrap' }}>{a.body}</p>
                {a.fileUrl && (
                  <button onClick={() => uploadApi.downloadFile(a.fileUrl, a.fileName).catch((e: any) => alert(e.message || 'Download failed.'))} style={{ fontSize: '12px', border: 'none', background: 'none', cursor: 'pointer', color: '#2563eb', padding: 0 }}>📎 {a.fileName || 'Attachment'}</button>
                )}
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '6px' }}>
                  {recipientLabel(a.author)} · {a.isBroadcast ? 'To: Everyone' : `To: ${a.recipients.map((r: any) => recipientLabel(r.user)).join(', ')}`} · {new Date(a.createdAt).toLocaleString()}
                </div>
              </div>
            );
          })}
          <div ref={feedEndRef} />
        </div>
      </div>

      <Modal isOpen={showCompose} onClose={() => setShowCompose(false)} title="New Announcement">
        {composeError && (
          <div style={{ padding: '10px 14px', marginBottom: 14, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>{composeError}</div>
        )}
        <FormField label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} required placeholder="e.g. Office closure" />
        <FormField label="Message" type="textarea" value={form.body} onChange={(v) => setForm({ ...form, body: v })} required placeholder="What do you want to share..." />

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--color-text-secondary)' }}>Audience</label>
          <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input type="radio" checked={audience === 'ALL'} onChange={() => setAudience('ALL')} /> Everyone
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input type="radio" checked={audience === 'SPECIFIC'} onChange={() => setAudience('SPECIFIC')} /> Specific People
            </label>
          </div>
        </div>

        {audience === 'SPECIFIC' && (
          <div style={{ marginBottom: '16px', maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: '10px', padding: '8px' }}>
            {recipientOptions.length === 0 ? (
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', padding: '8px' }}>Loading accounts…</p>
            ) : recipientOptions.map((r: any) => (
              <label key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', fontSize: '13px', cursor: 'pointer', borderRadius: '6px' }}>
                <input type="checkbox" checked={selectedRecipients.includes(r.id)} onChange={() => toggleRecipient(r.id)} />
                {recipientLabel(r)}
              </label>
            ))}
          </div>
        )}

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--color-text-secondary)' }}>Attachment (optional)</label>
          {file ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '13px' }}>
              <span>📎 {file.name}</span>
              <button onClick={() => setFile(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}><X size={14} /></button>
            </div>
          ) : (
            <label className="btn btn-secondary" style={{ display: 'inline-flex', cursor: uploading ? 'not-allowed' : 'pointer' }}>
              <Upload size={14} /> {uploading ? 'Uploading…' : 'Choose file'}
              <input type="file" style={{ display: 'none' }} disabled={uploading}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
            </label>
          )}
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button className="btn btn-secondary" onClick={() => setShowCompose(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handlePost}>Post</button>
        </div>
      </Modal>
    </div>
  );
}
