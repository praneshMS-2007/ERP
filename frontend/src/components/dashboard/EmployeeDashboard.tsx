'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Clock, CalendarOff, FolderKanban, AlertTriangle, Headphones } from 'lucide-react';
import Link from 'next/link';
import { selfApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const STATUS_LABEL: Record<string, string> = {
  PRESENT: 'Present', ABSENT: 'Absent', HALF_DAY: 'Half Day', LATE: 'Present',
  WEEKEND: 'Weekend', HOLIDAY: 'Holiday', NOT_MARKED: 'Not marked yet', NOT_JOINED: 'Not joined yet',
};

const TASK_STATUS_LABEL: Record<string, string> = {
  NOT_STARTED: 'Not Started', IN_PROGRESS: 'In Progress', REVIEW: 'In Review', DONE: 'Done',
};

/**
 * An Employee's home page — deliberately not the "Executive Dashboard"
 * every other role sees. Every number here is derived from /self/* routes,
 * which resolve the employee from the JWT, so there is no way for this
 * page to accidentally render another employee's data.
 */
export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [counts, setCounts] = useState({ present: 0, absent: 0, halfDay: 0 });
  const [todayStatus, setTodayStatus] = useState('—');
  const [projectCount, setProjectCount] = useState(0);
  const [priorityTasks, setPriorityTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const today = new Date();
        const [days, projects, tasks] = await Promise.all([
          selfApi.getAttendanceCalendar(today.getFullYear(), today.getMonth() + 1),
          selfApi.getProjects(),
          selfApi.getTasks(),
        ]);

        const dayList = Array.isArray(days) ? days : [];
        let present = 0, absent = 0, halfDay = 0;
        for (const d of dayList) {
          if (d.status === 'PRESENT' || d.status === 'LATE') present += 1;
          else if (d.status === 'ABSENT') absent += 1;
          else if (d.status === 'HALF_DAY') halfDay += 1;
        }
        setCounts({ present, absent, halfDay });

        const toKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const todayEntry = dayList.find((d: any) => d.date === toKey(today));
        setTodayStatus(todayEntry ? (STATUS_LABEL[todayEntry.status] || todayEntry.status) : '—');

        setProjectCount(Array.isArray(projects) ? projects.length : 0);

        const taskList = Array.isArray(tasks) ? tasks : [];
        setPriorityTasks(taskList.filter((t: any) => t.project?.priority === 'CRITICAL' || t.project?.priority === 'HIGH'));
      } catch (e) {
        console.error('Employee dashboard load error', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>Welcome back{user?.name ? `, ${user.name}` : ''}</h1>
          <p>Your own attendance, projects, and priority work — nobody else's is shown here.</p>
        </div>
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: '24px' }}>
        <div className="kpi-card">
          <div className="kpi-card-top">
            <div className="kpi-card-label">DAYS PRESENT</div>
            <div className="kpi-card-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}><CheckCircle2 size={20} /></div>
          </div>
          <div className="kpi-card-value">{loading ? '—' : counts.present}</div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>This month</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-top">
            <div className="kpi-card-label">DAYS ABSENT</div>
            <div className="kpi-card-icon" style={{ background: '#fef2f2', color: '#dc2626' }}><XCircle size={20} /></div>
          </div>
          <div className="kpi-card-value">{loading ? '—' : counts.absent}</div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>This month</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-top">
            <div className="kpi-card-label">HALF DAYS</div>
            <div className="kpi-card-icon" style={{ background: '#fffbeb', color: '#d97706' }}><Clock size={20} /></div>
          </div>
          <div className="kpi-card-value">{loading ? '—' : counts.halfDay}</div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>This month</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-top">
            <div className="kpi-card-label">TODAY</div>
            <div className="kpi-card-icon" style={{ background: '#eff6ff', color: '#2563eb' }}><CalendarOff size={20} /></div>
          </div>
          <div className="kpi-card-value" style={{ fontSize: '18px' }}>{loading ? '—' : todayStatus}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-top">
            <div className="kpi-card-label">PROJECTS INVOLVED</div>
            <div className="kpi-card-icon" style={{ background: '#f5f3ff', color: '#7c3aed' }}><FolderKanban size={20} /></div>
          </div>
          <div className="kpi-card-value">{loading ? '—' : projectCount}</div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={18} style={{ color: '#dc2626' }} /> Critical &amp; High Priority Tasks
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {loading ? (
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', textAlign: 'center', padding: '20px 0' }}>Loading…</p>
          ) : priorityTasks.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', textAlign: 'center', padding: '20px 0' }}>Nothing urgent on your plate right now.</p>
          ) : priorityTasks.map((t) => (
            <Link key={t.id} href={`/projects/${t.project?.id}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderRadius: '8px', background: 'var(--color-background)', border: '1px solid var(--color-border)', textDecoration: 'none', color: 'inherit' }}>
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 700 }}>{t.title}</div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                  {t.project?.name}{t.dueDate ? ` · Due ${new Date(t.dueDate).toLocaleDateString()}` : ''}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', color: t.project?.priority === 'CRITICAL' ? '#dc2626' : '#d97706' }}>{t.project?.priority}</span>
                <span className={`badge ${t.status === 'DONE' ? 'badge-healthy' : t.status === 'IN_PROGRESS' ? 'badge-warning' : ''}`}>{TASK_STATUS_LABEL[t.status] || t.status}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <Link href="/ai" className="ai-fab" aria-label="AI Assistant" style={{ textDecoration: 'none', color: 'white' }}>
        <Headphones size={24} />
      </Link>
    </div>
  );
}
