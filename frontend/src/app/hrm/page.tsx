'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  Users, UserMinus, Star, TrendingUp, TrendingDown,
  Calendar, ChevronLeft, ChevronRight, Download,
} from 'lucide-react';
import { hrmApi, exportApi } from '../../services/api';
import ExportButton from '../../components/ExportButton';

export default function HRManagement() {
  // Core data
  const [employees, setEmployees] = useState<any[]>([]);
  const [allLeaves, setAllLeaves] = useState<any[]>([]);
  const [perfReviews, setPerfReviews] = useState<any[]>([]);

  // Date-driven state
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());

  // Attendance stats for selected date
  const [attStats, setAttStats] = useState({ present: 0, absent: 0, total: 0 });

  // Monthly trend for chart
  const [trendData, setTrendData] = useState<{ year: number; totalEmployees: number; data: { month: number; monthName: string; present: number; absent: number }[] }>({ year: 2026, totalEmployees: 0, data: [] });

  async function fetchCoreData() {
    try {
      const [empData, leaveData, perfData] = await Promise.all([
        hrmApi.getEmployees(),
        hrmApi.getLeaves(),
        hrmApi.getPerformanceReviews(),
      ]);
      setEmployees(Array.isArray(empData) ? empData : []);
      setAllLeaves(Array.isArray(leaveData) ? leaveData : []);
      setPerfReviews(Array.isArray(perfData) ? perfData : []);
    } catch (e) {
      console.error('Failed to fetch HRM data:', e);
    }
  }

  async function fetchAttendanceStats(date: Date) {
    try {
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const stats = await hrmApi.getAttendanceStats(dateStr);
      if (stats && typeof stats.present === 'number') {
        setAttStats(stats);
      }
    } catch (e) {
      console.error('Failed to fetch attendance stats:', e);
    }
  }

  async function fetchTrend(year: number) {
    try {
      const data = await hrmApi.getAttendanceTrend(year);
      if (data && data.data) setTrendData(data);
    } catch (e) {
      console.error('Failed to fetch trend:', e);
    }
  }

  useEffect(() => { fetchCoreData(); }, []);
  useEffect(() => { fetchAttendanceStats(selectedDate); }, [selectedDate]);
  useEffect(() => { fetchTrend(calYear); }, [calYear]);

  // ========== COMPUTED KPIs ==========
  const activeEmployees = employees.filter(e => e.status !== 'INACTIVE');
  const resignedCount = employees.filter(e => e.status === 'INACTIVE').length;

  // Resignations this month
  const resignedThisMonth = employees.filter(e => {
    if (e.status !== 'INACTIVE') return false;
    const updated = new Date(e.updatedAt);
    return updated.getMonth() === calMonth && updated.getFullYear() === calYear;
  }).length;

  // Workforce growth
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const hiredThisMonth = employees.filter(e => new Date(e.joinDate) >= thisMonthStart).length;
  const hiredBeforeThisMonth = employees.length - hiredThisMonth;
  const growthPct = hiredBeforeThisMonth > 0 ? Math.round((hiredThisMonth / hiredBeforeThisMonth) * 100) : (hiredThisMonth > 0 ? 100 : 0);

  // Avg performance
  const avgPerf = perfReviews.length > 0 ? perfReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / perfReviews.length : 0;
  const perfLabel = (avg: number) => {
    if (avg >= 4.5) return '☆ Excellent rating';
    if (avg >= 4.0) return '☆ Good rating';
    if (avg >= 3.0) return '☆ Average rating';
    return '☆ Needs improvement';
  };

  // Request KPIs
  const pendingLeaves = allLeaves.filter(l => l.status === 'PENDING').length;
  const approvedThisMonth = allLeaves.filter(l => {
    if (l.status !== 'APPROVED') return false;
    const d = new Date(l.updatedAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  // ========== CALENDAR LOGIC ==========
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDayOffset = new Date(calYear, calMonth, 1).getDay();
  const prevMonthDays = new Date(calYear, calMonth, 0).getDate();
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const calendarDays = useMemo(() => {
    const days: { day: number; type: string; date: Date }[] = [];
    // Previous month padding
    for (let i = firstDayOffset - 1; i >= 0; i--) {
      days.push({ day: prevMonthDays - i, type: 'inactive', date: new Date(calYear, calMonth - 1, prevMonthDays - i) });
    }
    const today = new Date();
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(calYear, calMonth, d);
      const isToday = d === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear();
      const isSelected = d === selectedDate.getDate() && calMonth === selectedDate.getMonth() && calYear === selectedDate.getFullYear();
      days.push({ day: d, type: isToday ? 'today' : isSelected ? 'selected' : '', date });
    }
    // Next month padding to complete the grid
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        days.push({ day: i, type: 'inactive', date: new Date(calYear, calMonth + 1, i) });
      }
    }
    return days;
  }, [calYear, calMonth, selectedDate, daysInMonth, firstDayOffset, prevMonthDays]);

  function navigateMonth(dir: number) {
    let newMonth = calMonth + dir;
    let newYear = calYear;
    if (newMonth < 0) { newMonth = 11; newYear--; }
    if (newMonth > 11) { newMonth = 0; newYear++; }
    setCalMonth(newMonth);
    setCalYear(newYear);
    setSelectedDate(new Date(newYear, newMonth, 1));
  }

  function selectDay(date: Date) {
    setSelectedDate(date);
  }

  // ========== SVG CHART ==========
  const chartWidth = 720;
  const chartHeight = 260;
  const chartPadX = 50;
  const chartPadY = 30;
  const innerW = chartWidth - chartPadX * 2;
  const innerH = chartHeight - chartPadY * 2;
  const maxY = trendData.totalEmployees || 20;

  function toChartX(i: number) { return chartPadX + (i / 11) * innerW; }
  function toChartY(val: number) { return chartPadY + innerH - (val / maxY) * innerH; }

  const presentLine = trendData.data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${toChartX(i)} ${toChartY(d.present)}`).join(' ');
  const absentLine = trendData.data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${toChartX(i)} ${toChartY(d.absent)}`).join(' ');

  // Format selected date for display
  const selectedDateStr = selectedDate.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>HR Overview</h1>
          <p>Monitor workforce performance, attendance, and organizational growth.</p>
        </div>
        <div className="page-header-actions">
          <ExportButton onExport={(format) => exportApi.exportEmployees(format)} label="Export Employees" />
        </div>
      </div>

      {/* KPI Row 1 — Top Metrics */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {/* Total Workforce */}
        <div className="kpi-card">
          <div className="kpi-card-top">
            <div className="kpi-card-label">TOTAL WORKFORCE</div>
            <div className="kpi-card-icon" style={{ background: '#eff6ff', color: '#2563eb' }}><Users size={22} /></div>
          </div>
          <div className="kpi-card-value">{activeEmployees.length}</div>
          <div className="kpi-card-trend up" style={{ fontSize: '12px' }}>
            <TrendingUp size={14} /> +{growthPct}% from last month
          </div>
        </div>

        {/* Resigned */}
        <div className="kpi-card">
          <div className="kpi-card-top">
            <div className="kpi-card-label">RESIGNED</div>
            <div className="kpi-card-icon" style={{ background: '#fef2f2', color: '#dc2626' }}><UserMinus size={22} /></div>
          </div>
          <div className="kpi-card-value">{resignedCount}</div>
          <div style={{ fontSize: '12px', color: resignedThisMonth > 0 ? '#dc2626' : 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            {resignedThisMonth > 0 && <TrendingDown size={13} />} {resignedThisMonth} this month
          </div>
        </div>

        {/* Avg Performance */}
        <div className="kpi-card">
          <div className="kpi-card-top">
            <div className="kpi-card-label">AVG PERFORMANCE</div>
            <div className="kpi-card-icon" style={{ background: '#fffbeb', color: '#d97706' }}><Star size={22} /></div>
          </div>
          <div className="kpi-card-value">{avgPerf.toFixed(1)}</div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
            {perfLabel(avgPerf)}
          </div>
        </div>
      </div>

      {/* Row 2 — Calendar + Compact Present/Absent & Request KPIs (Parallel Layout) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '20px', marginTop: '20px' }}>

        {/* Left Column: Attendance Calendar */}
        <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Attendance Calendar</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button onClick={() => navigateMonth(-1)} style={{ border: '1px solid var(--color-border)', background: 'var(--color-card)', borderRadius: '6px', cursor: 'pointer', padding: '3px 6px', display: 'flex', alignItems: 'center' }}><ChevronLeft size={14} /></button>
              <span style={{ fontSize: '13px', fontWeight: 600, minWidth: '120px', textAlign: 'center' }}>{monthNames[calMonth]} {calYear}</span>
              <button onClick={() => navigateMonth(1)} style={{ border: '1px solid var(--color-border)', background: 'var(--color-card)', borderRadius: '6px', cursor: 'pointer', padding: '3px 6px', display: 'flex', alignItems: 'center' }}><ChevronRight size={14} /></button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', marginBottom: '8px' }}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
              <div key={i} style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', padding: '4px 0' }}>{d}</div>
            ))}
            {calendarDays.map((d, i) => (
              <div
                key={i}
                onClick={() => d.type !== 'inactive' && selectDay(d.date)}
                style={{
                  padding: '6px 0', fontSize: '12px', borderRadius: '6px', cursor: d.type !== 'inactive' ? 'pointer' : 'default',
                  fontWeight: d.type === 'today' || d.type === 'selected' ? 700 : 500,
                  color: d.type === 'inactive' ? '#d1d5db' : d.type === 'today' ? '#fff' : d.type === 'selected' ? '#2563eb' : 'var(--color-text)',
                  background: d.type === 'today' ? '#2563eb' : d.type === 'selected' ? '#dbeafe' : 'transparent',
                  border: d.type === 'selected' ? '2px solid #2563eb' : '2px solid transparent',
                  transition: 'all 0.15s ease',
                }}
              >
                {d.day}
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Present/Absent + Request KPIs stacked vertically */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'space-between' }}>
          
          {/* Present / Absent Stats (Compact) */}
          <div className="card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                <Calendar size={16} style={{ color: '#2563eb' }} />
                <span>{selectedDateStr}</span>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                Total Active: {attStats.total}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', background: 'var(--color-bg-secondary)', padding: '12px', borderRadius: '8px' }}>
              {/* Present */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#2563eb', lineHeight: 1 }}>{attStats.present}</div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', marginTop: '4px' }}>Present</div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                  {attStats.total > 0 ? ((attStats.present / attStats.total) * 100).toFixed(1) : '0.0'}%
                </div>
              </div>
              
              <div style={{ width: '1px', height: '40px', background: 'var(--color-border)' }}></div>

              {/* Absent */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#dc2626', lineHeight: 1 }}>{attStats.absent}</div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', marginTop: '4px' }}>Absent</div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                  {attStats.total > 0 ? ((attStats.absent / attStats.total) * 100).toFixed(1) : '0.0'}%
                </div>
              </div>
            </div>
          </div>

          {/* Leave Requests */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
            <div className="kpi-card" style={{ padding: '14px' }}>
              <div className="kpi-card-top" style={{ marginBottom: '8px' }}>
                <div className="kpi-card-label" style={{ fontSize: '11px' }}>LEAVE REQUESTS</div>
                <div className="kpi-card-icon" style={{ background: '#f5f3ff', color: '#7c3aed', width: '32px', height: '32px' }}><Calendar size={16} /></div>
              </div>
              <div className="kpi-card-value" style={{ fontSize: '22px' }}>{pendingLeaves}</div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                <TrendingUp size={12} /> {approvedThisMonth} approved
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Row 4 — Monthly Attendance Trend Chart */}
      <div className="card" style={{ marginTop: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Monthly Attendance Trend</h3>
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{calYear} · Max Employees: {trendData.totalEmployees}</span>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: 12, height: 3, borderRadius: 2, background: '#2563eb' }}></div>
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Present</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: 12, height: 3, borderRadius: 2, background: '#dc2626' }}></div>
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Absent</span>
            </div>
            <ExportButton onExport={(format) => exportApi.exportAttendance(format, calMonth + 1, calYear)} label="Export" />
          </div>
        </div>

        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ width: '100%', height: 'auto' }}>
          {/* Y-axis Title Label */}
          <text transform={`rotate(-90, 15, ${chartPadY + innerH / 2})`} x={15} y={chartPadY + innerH / 2} textAnchor="middle" fontSize={10} fontWeight={700} fill="var(--color-text-muted)">No. of Employees</text>

          {/* Y-axis grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((frac, i) => {
            const y = chartPadY + innerH * (1 - frac);
            return (
              <g key={i}>
                <line x1={chartPadX} x2={chartWidth - chartPadX} y1={y} y2={y} stroke="var(--color-border-light)" strokeWidth={1} strokeDasharray={i === 0 ? '' : '4,4'} />
                <text x={chartPadX - 8} y={y + 4} textAnchor="end" fontSize={10} fill="var(--color-text-muted)">{Math.round(maxY * frac)}</text>
              </g>
            );
          })}

          {/* X-axis labels */}
          {trendData.data.map((d, i) => (
            <text key={i} x={toChartX(i)} y={chartHeight - 5} textAnchor="middle" fontSize={10} fill="var(--color-text-muted)" fontWeight={d.month === calMonth + 1 ? 700 : 400}>{d.monthName}</text>
          ))}

          {/* Present line */}
          {presentLine && <path d={presentLine} fill="none" stroke="#2563eb" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />}
          {/* Absent line */}
          {absentLine && <path d={absentLine} fill="none" stroke="#dc2626" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="6,3" />}

          {/* Data points */}
          {trendData.data.map((d, i) => (
            <g key={i}>
              <circle cx={toChartX(i)} cy={toChartY(d.present)} r={4} fill="#2563eb" />
              <circle cx={toChartX(i)} cy={toChartY(d.absent)} r={4} fill="#dc2626" />
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
