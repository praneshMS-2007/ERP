'use client';

import { useState, useEffect } from 'react';
import { Calendar, Mail, Phone, Pencil, Plus, Check } from 'lucide-react';
import { crmApi } from '../../../services/api';
import Modal, { FormField } from '../../../components/Modal';

export default function ContactsPage() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [followups, setFollowups] = useState<any[]>([]);
  const [showFollowupModal, setShowFollowupModal] = useState(false);

  const [followupForm, setFollowupForm] = useState({ customerId: '', type: 'CALL', date: '', notes: '' });
  const [filterType, setFilterType] = useState('');
  const [followupError, setFollowupError] = useState('');

  // Editing is the only mutation left on this page — a contact's record
  // always started life as a Lead (see the "single funnel" note below), so
  // this reuses updateLead/updateCustomer depending on which stage it's at.
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', company: '', source: '', status: '' });
  const [editError, setEditError] = useState('');

  async function fetchData() {
    try {
      const [customers, leads, follows] = await Promise.all([
        crmApi.getCustomers(),
        crmApi.getLeads(),
        crmApi.getFollowUps()
      ]);
      const mergedContacts = [
        ...(Array.isArray(customers) ? customers.map((c: any) => ({ ...c, type: 'CUSTOMER' })) : []),
        ...(Array.isArray(leads) ? leads.map((l: any) => ({ ...l, type: 'LEAD' })) : [])
      ];
      setContacts(mergedContacts);
      if (follows && Array.isArray(follows)) setFollowups(follows);
    } catch (e) {
      console.error('Contacts fetch error', e);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  function openEdit(c: any) {
    setEditTarget(c);
    setEditForm({
      name: c.name || '', email: c.email || '', phone: c.phone || '', company: c.company || '',
      source: c.source || '', status: c.status || '',
    });
    setEditError('');
  }

  async function handleSaveEdit() {
    if (!editTarget) return;
    setEditError('');
    try {
      if (editTarget.type === 'LEAD') {
        await crmApi.updateLead(editTarget.id, {
          name: editForm.name, email: editForm.email, phone: editForm.phone, company: editForm.company,
          source: editForm.source, status: editForm.status,
        });
      } else {
        await crmApi.updateCustomer(editTarget.id, {
          name: editForm.name, email: editForm.email, phone: editForm.phone, company: editForm.company,
        });
      }
      setEditTarget(null);
      fetchData();
    } catch (e: any) {
      setEditError(e.message || 'Could not update this contact.');
    }
  }

  async function handleCompleteFollowup(id: string) {
    try {
      await crmApi.completeFollowUp(id);
      fetchData();
    } catch (e: any) {
      alert(e.message || 'Could not mark this follow-up done.');
    }
  }

  async function handleScheduleFollowup() {
    if (!followupForm.date) return;
    setFollowupError('');
    try {
      await crmApi.createFollowUp({
        type: followupForm.type,
        date: new Date(followupForm.date).toISOString(),
        notes: followupForm.notes,
        customerId: followupForm.customerId || undefined,
      });
      setShowFollowupModal(false);
      setFollowupForm({ customerId: '', type: 'CALL', date: '', notes: '' });
      fetchData();
    } catch (e: any) {
      setFollowupError(e.message || 'Could not schedule this follow-up.');
    }
  }

  let filteredContacts = [...contacts];
  if (filterType) filteredContacts = filteredContacts.filter(c => c.type === filterType);

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>Customer Contacts</h1>
          <p>Every lead and customer, in one directory — read and edit only. New contacts always start as a Lead.</p>
        </div>
        <div className="page-header-actions">
          <select className="btn btn-secondary" value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ fontSize: '13px' }}>
            <option value="">All Types</option>
            <option value="CUSTOMER">Customers</option>
            <option value="LEAD">Leads</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>

        {/* Contacts Directory */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Contact Directory ({filteredContacts.length})</h3>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Contact</th>
                <th>Company</th>
                <th>Contact Details</th>
                <th>Type</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredContacts.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '20px' }}>No contacts found</td></tr>
              ) : filteredContacts.map((c, i) => (
                <tr key={c.id || i}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div className="avatar" style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{c.name ? c.name.charAt(0).toUpperCase() : 'C'}</div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{c.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{c.type === 'CUSTOMER' ? 'Customer' : 'Lead'}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontWeight: 600 }}>{c.company || '--'}</td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}><Mail size={12} color="var(--color-text-muted)"/> {c.email || 'N/A'}</div>
                      {c.phone && <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}><Phone size={12} color="var(--color-text-muted)"/> {c.phone}</div>}
                    </div>
                  </td>
                  <td><span className={`badge ${c.type === 'CUSTOMER' ? 'badge-healthy' : 'badge-default'}`}>{c.type}</span></td>
                  <td>
                    <button className="btn btn-secondary btn-sm" onClick={() => openEdit(c)}><Pencil size={13} /> Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Scheduled Follow-ups */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Upcoming Follow-ups</h3>
            <button className="btn btn-secondary btn-sm" onClick={() => { setFollowupError(''); setShowFollowupModal(true); }}><Plus size={14} /> Schedule</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {followups.filter(f => !f.completedAt).length === 0 ? (
              <div style={{ color: 'var(--color-text-muted)', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>No scheduled follow-ups</div>
            ) : followups.filter(f => !f.completedAt).map((f, i) => (
              <div key={f.id || i} style={{ padding: '16px', border: '1px solid var(--color-border)', borderRadius: '8px', background: '#f9fafb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700 }}>{f.customer?.name || f.lead?.name || 'General Follow-up'}</div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{f.customer?.company || f.notes || 'No details'}</div>
                  </div>
                  <span className={'badge badge-warning'} style={{ fontSize: '10px' }}>
                    <Calendar size={10} style={{ marginRight: '4px' }}/> {new Date(f.date).toLocaleDateString()}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '13px', color: '#111827', fontWeight: 600 }}>Type: {f.type}</div>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleCompleteFollowup(f.id)}>
                    <Check size={13} /> Mark Done
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* EDIT CONTACT MODAL — routes to updateLead or updateCustomer depending on stage */}
      <Modal isOpen={!!editTarget} onClose={() => setEditTarget(null)} title={`Edit ${editTarget?.type === 'CUSTOMER' ? 'Customer' : 'Lead'} — ${editTarget?.name || ''}`}>
        {editError && (
          <div style={{ padding: '10px 14px', marginBottom: 14, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>{editError}</div>
        )}
        <FormField label="Full Name" value={editForm.name} onChange={(v) => setEditForm({ ...editForm, name: v })} required placeholder="e.g. John Doe" />
        <FormField label="Email" type="email" value={editForm.email} onChange={(v) => setEditForm({ ...editForm, email: v })} placeholder="john@acme.com" />
        <FormField label="Phone" value={editForm.phone} onChange={(v) => setEditForm({ ...editForm, phone: v })} placeholder="+1 555-0199" />
        <FormField label="Company Name" value={editForm.company} onChange={(v) => setEditForm({ ...editForm, company: v })} placeholder="Acme Global Inc" />
        {editTarget?.type === 'LEAD' && (
          <>
            <FormField label="Source" type="select" value={editForm.source} onChange={(v) => setEditForm({ ...editForm, source: v })}
              options={[{ label: 'Website', value: 'WEBSITE' }, { label: 'Referral', value: 'REFERRAL' }, { label: 'LinkedIn', value: 'LINKEDIN' }, { label: 'Cold Call', value: 'COLD_CALL' }, { label: 'Trade Show', value: 'TRADE_SHOW' }]} />
            <FormField label="Status" type="select" value={editForm.status} onChange={(v) => setEditForm({ ...editForm, status: v })}
              options={[{ label: 'New', value: 'NEW' }, { label: 'Contacted', value: 'CONTACTED' }, { label: 'Qualified', value: 'QUALIFIED' }, { label: 'Lost', value: 'LOST' }]} />
          </>
        )}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button className="btn btn-secondary" onClick={() => setEditTarget(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSaveEdit}>Save</button>
        </div>
      </Modal>

      {/* SCHEDULE FOLLOWUP MODAL */}
      <Modal isOpen={showFollowupModal} onClose={() => setShowFollowupModal(false)} title="Schedule Follow-up">
        {followupError && (
          <div style={{ padding: '10px 14px', marginBottom: 14, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>{followupError}</div>
        )}
        <FormField label="Customer" type="select" value={followupForm.customerId} onChange={(v) => setFollowupForm({ ...followupForm, customerId: v })}
          options={contacts.filter(c => c.type === 'CUSTOMER').map(c => ({ label: c.name, value: c.id }))} />
        <FormField label="Follow-up Type" type="select" value={followupForm.type} onChange={(v) => setFollowupForm({ ...followupForm, type: v })}
          options={[{ label: 'Call', value: 'CALL' }, { label: 'Email', value: 'EMAIL' }, { label: 'Meeting', value: 'MEETING' }, { label: 'Demo', value: 'DEMO' }]} />
        <FormField label="Date" type="date" value={followupForm.date} onChange={(v) => setFollowupForm({ ...followupForm, date: v })} required />
        <FormField label="Notes" type="textarea" value={followupForm.notes} onChange={(v) => setFollowupForm({ ...followupForm, notes: v })} placeholder="Discussion agenda..." />
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button className="btn btn-secondary" onClick={() => setShowFollowupModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleScheduleFollowup}>Schedule</button>
        </div>
      </Modal>

    </div>
  );
}
