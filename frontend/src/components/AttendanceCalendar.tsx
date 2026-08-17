'use client';

import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle, Clock, CalendarOff } from 'lucide-react';

export interface AttendanceDay {
  date: string; // "YYYY-MM-DD"
  status: string;
  holidayTitle?: string;
}

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  PRESENT: { bg: '#f0fdf4', color: '#16a34a', label: 'Present' },
  ABSENT: { bg: '#fef2f2', color: '#dc2626', label: 'Absent' },
  HALF_DAY: { bg: '#fffbeb', color: '#d97706', label: 'Half Day' },
  LATE: { bg: '#fff7ed', color: '#ea580c', label: 'Late' },
  WEEKEND: { bg: '#f9fafb', color: '#9ca3af', label: 'Weekend' },
  HOLIDAY: { bg: '#f5f3ff', color: '#7c3aed', label: 'Holiday' },
  NOT_MARKED: { bg: '#eff6ff', color: '#2563eb', label: 'Not marked yet' },
  NOT_JOINED: { bg: 'transparent', color: '#e5e7eb', label: 'Not joined yet' },
};

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Today gets this dot color regardless of its attendance status, so "which
// cell is today" never depends on reading the status color. Selection gets
// a differently-colored ring so the two cues never look like the same thing.
const TODAY_ACCENT = '#2563eb';
const SELECTED_ACCENT = '#7c3aed';

const toKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * Shared by the Employee's own Attendance page and HR's per-employee
 * history drill-down — same visual language as the day-cell grid in
 * hrm/page.tsx's Attendance Calendar widget, extended with a color per real
 * status instead of just today/selected. `fetchMonth` is the only thing
 * that differs between the two callers (self vs a specific employeeId).
 */
export default function AttendanceCalendar({ fetchMonth }: { fetchMonth: (year: number, month: number) => Promise<AttendanceDay[]> }) {
  const today = new Date();
  const todayKey = toKey(today);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1); // 1-based
  const [days, setDays] = useState<AttendanceDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AttendanceDay | null>(null);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await fetchMonth(year, month);
      const dayList = Array.isArray(data) ? data : [];
      setDays(dayList);
      // Default the right-hand detail panel to today when today falls
      // inside the month just loaded; browsing to a different month clears
      // the selection instead of leaving a stale date on screen.
      setSelected(dayList.find((d) => d.date === todayKey) || null);
    } catch (e: any) {
      setError(e.message || 'Could not load attendance.');
      setDays([]);
      setSelected(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [year, month]); // eslint-disable-line react-hooks/exhaustive-deps

  function navigateMonth(dir: number) {
    let newMonth = month + dir;
    let newYear = year;
    if (newMonth < 1) { newMonth = 12; newYear--; }
    if (newMonth > 12) { newMonth = 1; newYear++; }
    setMonth(newMonth);
    setYear(newYear);
  }

  const byDate = useMemo(() => {
    const m = new Map<string, AttendanceDay>();
    for (const d of days) m.set(d.date, d);
    return m;
  }, [days]);

  const counts = useMemo(() => {
    let present = 0, absent = 0, halfDay = 0;
    for (const d of days) {
      if (d.status === 'PRESENT' || d.status === 'LATE') present += 1;
      else if (d.status === 'ABSENT') absent += 1;
      else if (d.status === 'HALF_DAY') halfDay += 1;
    }
    return { present, absent, halfDay };
  }, [days]);

  const todayEntry = byDate.get(todayKey);
  const todayStatus = todayEntry ? (STATUS_STYLE[todayEntry.status]?.label || todayEntry.status) : '—';

  const firstDayOffset = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const prevMonthDays = new Date(year, month - 1, 0).getDate();

  const grid = useMemo(() => {
    const cells: { day: number; key: string; inMonth: boolean }[] = [];
    for (let i = firstDayOffset - 1; i >= 0; i--) {
      cells.push({ day: prevMonthDays - i, key: '', inMonth: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, key: toKey(new Date(year, month - 1, d)), inMonth: true });
    }
    const remaining = 7 - (cells.length % 7);
    if (remaining < 7) for (let i = 1; i <= remaining; i++) cells.push({ day: i, key: '', inMonth: false });
    return cells;
  }, [year, month, firstDayOffset, daysInMonth, prevMonthDays]);

  return (
    <div>
      {/* KPI cards */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '20px' }}>
        <div className="kpi-card">
          <div className="kpi-card-top">
            <div className="kpi-card-label">DAYS PRESENT</div>
            <div className="kpi-card-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}><CheckCircle2 size={20} /></div>
          </div>
          <div className="kpi-card-value">{counts.present}</div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>This month</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-top">
            <div className="kpi-card-label">DAYS ABSENT</div>
            <div className="kpi-card-icon" style={{ background: '#fef2f2', color: '#dc2626' }}><XCircle size={20} /></div>
          </div>
          <div className="kpi-card-value">{counts.absent}</div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>This month</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-top">
            <div className="kpi-card-label">HALF DAYS</div>
            <div className="kpi-card-icon" style={{ background: '#fffbeb', color: '#d97706' }}><Clock size={20} /></div>
          </div>
          <div className="kpi-card-value">{counts.halfDay}</div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>This month</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-top">
            <div className="kpi-card-label">TODAY</div>
            <div className="kpi-card-icon" style={{ background: '#eff6ff', color: '#2563eb' }}><CalendarOff size={20} /></div>
          </div>
          <div className="kpi-card-value" style={{ fontSize: '18px' }}>{todayStatus}</div>
        </div>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', marginBottom: 14, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>{error}</div>
      )}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Calendar</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button onClick={() => navigateMonth(-1)} style={{ border: '1px solid var(--color-border)', background: 'var(--color-card)', borderRadius: '6px', cursor: 'pointer', padding: '3px 6px', display: 'flex', alignItems: 'center' }}><ChevronLeft size={14} /></button>
            <span style={{ fontSize: '13px', fontWeight: 600, minWidth: '120px', textAlign: 'center' }}>{MONTH_NAMES[month - 1]} {year}</span>
            <button onClick={() => navigateMonth(1)} style={{ border: '1px solid var(--color-border)', background: 'var(--color-card)', borderRadius: '6px', cursor: 'pointer', padding: '3px 6px', display: 'flex', alignItems: 'center' }}><ChevronRight size={14} /></button>
          </div>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', padding: '30px 0', color: 'var(--color-text-muted)', fontSize: 13 }}>Loading…</p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '28px' }}>
            {/* LEFT HALF — the month grid + legend */}
            <div style={{ flex: '1 1 380px', minWidth: '340px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', marginBottom: '8px' }}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                  <div key={d} style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', padding: '4px 0' }}>{d}</div>
                ))}
                {grid.map((cell, i) => {
                  const entry = cell.inMonth ? byDate.get(cell.key) : undefined;
                  const style = entry ? STATUS_STYLE[entry.status] : undefined;
                  const isToday = cell.key === todayKey;
                  const isSelected = !!selected && cell.key === selected.date;
                  return (
                    <div
                      key={i}
                      onClick={() => entry && setSelected(entry)}
                      title={style?.label}
                      style={{
                        position: 'relative',
                        padding: '8px 0', fontSize: '12px', borderRadius: '6px', cursor: entry ? 'pointer' : 'default',
                        fontWeight: isToday ? 700 : 500,
                        color: !cell.inMonth ? '#e5e7eb' : style ? style.color : 'var(--color-text-muted)',
                        background: !cell.inMonth ? 'transparent' : style ? style.bg : 'transparent',
                        // Selection is always a ring, drawn in its own color, so
                        // it never gets confused with "today"'s dot below.
                        boxShadow: isSelected ? `0 0 0 2px ${SELECTED_ACCENT}` : 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {cell.day}
                      {isToday && (
                        <span style={{
                          position: 'absolute', bottom: '3px', left: '50%', transform: 'translateX(-50%)',
                          width: '4px', height: '4px', borderRadius: '50%', background: TODAY_ACCENT,
                        }} />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--color-border)' }}>
                {(['PRESENT', 'ABSENT', 'HALF_DAY', 'LATE', 'WEEKEND', 'HOLIDAY'] as const).map((s) => (
                  <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', color: 'var(--color-text-muted)' }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: STATUS_STYLE[s].bg, border: `1.5px solid ${STATUS_STYLE[s].color}` }} />
                    {STATUS_STYLE[s].label}
                  </div>
                ))}
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', color: 'var(--color-text-muted)' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: TODAY_ACCENT }} />
                  Today
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', color: 'var(--color-text-muted)' }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, boxShadow: `0 0 0 2px ${SELECTED_ACCENT}` }} />
                  Selected
                </div>
              </div>
            </div>

            {/* RIGHT HALF — detail panel for whichever day is selected */}
            <div style={{ flex: '1 1 280px', minWidth: '260px', borderLeft: '1px solid var(--color-border)', paddingLeft: '28px' }}>
              {selected ? (
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                    {selected.date === todayKey ? 'Today' : 'Selected Date'}
                  </div>
                  <div style={{ fontSize: '17px', fontWeight: 700, marginBottom: '16px' }}>
                    {new Date(selected.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '10px',
                    background: STATUS_STYLE[selected.status]?.bg, color: STATUS_STYLE[selected.status]?.color, fontSize: '14px', fontWeight: 700,
                  }}>
                    {STATUS_STYLE[selected.status]?.label || selected.status}
                  </div>
                  {selected.holidayTitle && (
                    <div style={{ marginTop: '14px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                      <span style={{ fontWeight: 700 }}>Holiday: </span>{selected.holidayTitle}
                    </div>
                  )}
                </div>
              ) : (
                <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Click a date on the calendar to see its status here.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
