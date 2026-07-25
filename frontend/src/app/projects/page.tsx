'use client';

import { useEffect, useState } from 'react';
import {
  FolderKanban,
  CheckCircle2,
  Clock,
  AlertOctagon,
  Plus,
  Filter,
  MoreHorizontal,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import { projectApi } from '../../services/api';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [stats, setStats] = useState({
    active: 0,
    completed: 0,
    atRisk: 0,
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const [projData] = await Promise.all([
          projectApi.getProjects(),
        ]);

        let completed = 0;
        let atRisk = 0;

        const formattedProjects = projData.map((p: any) => {
          let status = 'ON TRACK';
          
          if (p.status === 'COMPLETED') {
            status = 'COMPLETED';
            completed++;
          } else if (p.status === 'AT_RISK') {
            status = 'AT RISK';
            atRisk++;
          } else if (p.status === 'DELAYED') {
            status = 'DELAYED';
          }

          // Calculate progress based on tasks
          let progress = 0;
          if (p.tasks && p.tasks.length > 0) {
            const completedTasks = p.tasks.filter((t: any) => t.status === 'DONE').length;
            progress = Math.round((completedTasks / p.tasks.length) * 100);
          } else {
             // Mock progress if no tasks exist
             progress = Math.floor(Math.random() * 80) + 10;
          }

          return {
            name: p.name,
            client: p.clientId ? 'External Client' : 'Internal',
            progress,
            status,
            team: p.assignments?.map((a: any) => a.employee?.firstName?.substring(0, 2).toUpperCase() || 'UN') || [],
            date: new Date(p.endDate || p.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          };
        });

        setStats({
          active: projData.length - completed,
          completed,
          atRisk,
        });

        setProjects(formattedProjects);
      } catch (e) {
        console.error('Failed to fetch project data:', e);
      }
    }
    fetchData();
  }, []);

  const badgeClass = (s: string) => {
    if (s === 'ON TRACK' || s === 'COMPLETED') return 'badge badge-healthy';
    if (s === 'AT RISK') return 'badge badge-warning';
    if (s === 'DELAYED') return 'badge badge-critical';
    return 'badge';
  };

  return (
    <div className="fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>Project Management</h1>
          <p>Track initiatives, monitor team capacity, and ensure timely delivery.</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary">
            <Filter size={16} /> Filter
          </button>
          <button className="btn btn-primary">
            <Plus size={16} /> New Project
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="kpi-grid" style={{ marginBottom: '24px' }}>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <div className="kpi-card-label">Active Projects</div>
            <div className="kpi-card-icon" style={{ background: '#eff6ff', color: '#2563eb' }}><FolderKanban size={20} /></div>
          </div>
          <div className="kpi-card-value">{stats.active}</div>
          <div className="kpi-card-trend up"><TrendingUp size={14} /> Tracking all active</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <div className="kpi-card-label">Completed (YTD)</div>
            <div className="kpi-card-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}><CheckCircle2 size={20} /></div>
          </div>
          <div className="kpi-card-value">{stats.completed}</div>
          <div className="kpi-card-trend neutral" style={{color: 'var(--color-text-muted)'}}>89% success rate</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <div className="kpi-card-label">Total Hours Logged</div>
            <div className="kpi-card-icon" style={{ background: '#fdf4ff', color: '#c026d3' }}><Clock size={20} /></div>
          </div>
          <div className="kpi-card-value">12.4k</div>
          <div className="kpi-card-trend neutral" style={{color: 'var(--color-text-muted)'}}>This quarter</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <div className="kpi-card-label">At Risk</div>
            <div className="kpi-card-icon" style={{ background: '#fef2f2', color: '#dc2626' }}><AlertOctagon size={20} /></div>
          </div>
          <div className="kpi-card-value" style={{ color: '#dc2626' }}>{stats.atRisk}</div>
          <div className="kpi-card-trend down">Requires attention</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
        {/* Active Projects List */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Priority Initiatives</h3>
            <Link href="#" style={{ fontSize: '13px', color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>View Board</Link>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Project Name</th>
                <th>Client</th>
                <th>Progress</th>
                <th>Status</th>
                <th>Team</th>
                <th>Due Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {projects.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '20px' }}>Loading or no data...</td></tr>
              ) : projects.map((p, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{p.name}</td>
                  <td style={{ color: 'var(--color-text-secondary)' }}>{p.client}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div className="progress-bar-track" style={{ width: '60px', marginBottom: 0 }}>
                        <div className="progress-bar-fill" style={{ width: `${p.progress}%`, background: p.progress > 80 ? '#16a34a' : '#2563eb' }} />
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)' }}>{p.progress}%</span>
                    </div>
                  </td>
                  <td><span className={badgeClass(p.status)}>{p.status}</span></td>
                  <td>
                    <div style={{ display: 'flex' }}>
                      {p.team.slice(0, 3).map((member: string, idx: number) => (
                        <div key={idx} style={{ 
                          width: '24px', height: '24px', borderRadius: '50%', 
                          background: '#e5e7eb', color: '#374151', fontSize: '10px', 
                          fontWeight: 700, display: 'flex', alignItems: 'center', 
                          justifyContent: 'center', marginLeft: idx > 0 ? '-8px' : '0',
                          border: '2px solid white'
                        }}>
                          {member}
                        </div>
                      ))}
                      {p.team.length > 3 && (
                         <div style={{ 
                          width: '24px', height: '24px', borderRadius: '50%', 
                          background: '#f3f4f6', color: '#6b7280', fontSize: '10px', 
                          fontWeight: 700, display: 'flex', alignItems: 'center', 
                          justifyContent: 'center', marginLeft: '-8px',
                          border: '2px solid white'
                        }}>
                          +{p.team.length - 3}
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={{ fontSize: '13px' }}>{p.date}</td>
                  <td>
                    <button style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                      <MoreHorizontal size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Team Capacity */}
          <div className="card">
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Team Capacity</h3>
            {[
              { team: 'Frontend Engineering', used: 85, color: '#2563eb' },
              { team: 'Backend Engineering', used: 92, color: '#dc2626' },
              { team: 'UI/UX Design', used: 60, color: '#16a34a' },
              { team: 'QA & Testing', used: 45, color: '#f59e0b' },
            ].map((t, i) => (
              <div key={i} style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  <span>{t.team}</span>
                  <span>{t.used}%</span>
                </div>
                <div className="progress-bar-track">
                  <div className="progress-bar-fill" style={{ width: `${t.used}%`, background: t.color }} />
                </div>
              </div>
            ))}
          </div>

          {/* Upcoming Milestones */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Upcoming Milestones</h3>
            </div>
            {[
              { title: 'Alpha Release v1.0', project: 'Alpha Core Migration', date: 'Tomorrow, 5:00 PM', urgency: 'high' },
              { title: 'Design System Sign-off', project: 'Beta Launch Campaign', date: 'Oct 15, 10:00 AM', urgency: 'medium' },
              { title: 'Server Rack Installation', project: 'Data Center Upgrade', date: 'Oct 18, 9:00 AM', urgency: 'low' },
            ].map((m, i) => (
              <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '10px 0', borderBottom: i < 2 ? '1px solid var(--color-border-light)' : 'none' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: m.urgency === 'high' ? '#dc2626' : m.urgency === 'medium' ? '#f59e0b' : '#3b82f6' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>{m.title}</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{m.project} • {m.date}</div>
                </div>
                <ChevronRight size={16} style={{ color: 'var(--color-text-muted)' }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
