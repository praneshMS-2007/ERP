'use client';

import { useState, useEffect } from 'react';
import { Users, Filter, Plus, Calendar, Mail, Phone, ExternalLink, CheckCircle } from 'lucide-react';
import { crmApi } from '../../../services/api';
import Modal, { FormField } from '../../../components/Modal';

export default function ContactsPage() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [followups, setFollowups] = useState<any[]>([]);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showFollowupModal, setShowFollowupModal] = useState(false);
  
  const [contactForm, setContactForm] = useState({ name: '', email: '', phone: '', company: '' });
  const [followupForm, setFollowupForm] = useState({ customerId: '', type: 'CALL', date: '', notes: '' });
  const [filterType, setFilterType] = useState('');

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

  async function handleAddContact() {
    if (!contactForm.name) return;
    await crmApi.createCustomer(contactForm as any);
    setShowContactModal(false);
    setContactForm({ name: '', email: '', phone: '', company: '' });
    fetchData();
  }

  async function handleScheduleFollowup() {
    if (!followupForm.date) return;
    await crmApi.createFollowUp({
      type: followupForm.type,
      date: new Date(followupForm.date).toISOString(),
      notes: followupForm.notes,
      customerId: followupForm.customerId || undefined,
    });
    setShowFollowupModal(false);
    setFollowupForm({ customerId: '', type: 'CALL', date: '', notes: '' });
    fetchData();
  }

  let filteredContacts = [...contacts];
  if (filterType) filteredContacts = filteredContacts.filter(c => c.type === filterType);

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>Customer Contacts</h1>
          <p>Manage customer profiles, directory, and scheduled follow-ups.</p>
        </div>
        <div className="page-header-actions">
          <select className="btn btn-secondary" value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ fontSize: '13px' }}>
            <option value="">All Types</option>
            <option value="CUSTOMER">Customers</option>
            <option value="LEAD">Leads</option>
          </select>
          <button className="btn btn-primary" onClick={() => setShowContactModal(true)}>
            <Plus size={16} /> Add Contact
          </button>
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
              </tr>
            </thead>
            <tbody>
              {filteredContacts.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '20px' }}>No contacts found</td></tr>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Scheduled Follow-ups */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Upcoming Follow-ups</h3>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowFollowupModal(true)}><Plus size={14} /> Schedule</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {followups.length === 0 ? (
              <div style={{ color: 'var(--color-text-muted)', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>No scheduled follow-ups</div>
            ) : followups.map((f, i) => (
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
                <div style={{ fontSize: '13px', color: '#111827', fontWeight: 600 }}>Type: {f.type}</div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ADD CONTACT MODAL */}
      <Modal isOpen={showContactModal} onClose={() => setShowContactModal(false)} title="Add Customer Contact">
        <FormField label="Full Name" value={contactForm.name} onChange={(v) => setContactForm({ ...contactForm, name: v })} required placeholder="e.g. John Doe" />
        <FormField label="Email" type="email" value={contactForm.email} onChange={(v) => setContactForm({ ...contactForm, email: v })} placeholder="john@acme.com" />
        <FormField label="Phone" value={contactForm.phone} onChange={(v) => setContactForm({ ...contactForm, phone: v })} placeholder="+1 555-0199" />
        <FormField label="Company Name" value={contactForm.company} onChange={(v) => setContactForm({ ...contactForm, company: v })} placeholder="Acme Global Inc" />
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button className="btn btn-secondary" onClick={() => setShowContactModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAddContact}>Add Contact</button>
        </div>
      </Modal>

      {/* SCHEDULE FOLLOWUP MODAL */}
      <Modal isOpen={showFollowupModal} onClose={() => setShowFollowupModal(false)} title="Schedule Follow-up">
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
