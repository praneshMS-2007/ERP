'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  ShieldAlert,
  ShieldCheck,
  Activity,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  Search,
  User,
  Building,
  Layers,
  ArrowUpDown,
  Clock,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  Edit3,
  Trash2,
  CheckCircle2,
  LogIn,
  AlertCircle,
  Eye,
  X,
  FileSpreadsheet,
  FileText,
  ListFilter,
  BarChart2,
  TrendingUp,
  SlidersHorizontal,
} from 'lucide-react';
import { analyticsApi, AuditLogFilterParams } from '@/services/api';
import { BarChart, DoughnutChart } from '@/components/dashboard/Charts';

interface AuditLogItem {
  id: string;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  role: string | null;
  department: string | null;
  actionType: string;
  action: string;
  module: string;
  entityType: string | null;
  entityId: string | null;
  description: string;
  ipAddress: string | null;
  userAgent: string | null;
  details: string | null;
  timestamp: string;
  user?: {
    id: string;
    email: string | null;
    username: string | null;
    role?: { id: string; name: string };
    employee?: {
      id: string;
      firstName: string;
      lastName: string;
      empCode: string | null;
      avatarUrl: string | null;
      department?: { id: string; name: string };
      designation?: { id: string; title: string };
    };
  };
}

interface ManagerOption {
  id: string;
  displayName: string;
  email: string;
  role: string;
  department: string;
  empCode: string | null;
}

interface AuditStats {
  totalEvents: number;
  activeManagersCount: number;
  mostActiveModule: string;
  actionBreakdown: Record<string, number>;
  moduleBreakdown: Record<string, number>;
  timeline: { date: string; total: number; create: number; update: number; delete: number }[];
  topActiveManagers: { userId: string; count: number; name: string; role: string; department: string }[];
}

const ACTION_COLORS: Record<string, { bg: string; text: string; border: string; icon: any }> = {
  CREATE: { bg: '#ecfdf5', text: '#065f46', border: '#a7f3d0', icon: PlusCircle },
  UPDATE: { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe', icon: Edit3 },
  DELETE: { bg: '#fef2f2', text: '#991b1b', border: '#fecaca', icon: Trash2 },
  STATUS_CHANGE: { bg: '#faf5ff', text: '#6b21a8', border: '#e9d5ff', icon: CheckCircle2 },
  LOGIN: { bg: '#fffbeb', text: '#92400e', border: '#fde68a', icon: LogIn },
  OTHER: { bg: '#f3f4f6', text: '#374151', border: '#e5e7eb', icon: Activity },
};

const MODULE_COLORS: Record<string, string> = {
  HR: '#2563eb',
  INVENTORY: '#059669',
  FINANCE: '#d97706',
  CRM: '#7c3aed',
  PROJECTS: '#0284c7',
  ADMIN: '#dc2626',
  SETTINGS: '#4b5563',
  OTHER: '#6b7280',
};

export default function AnalyticsPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  // Filters
  const [datePreset, setDatePreset] = useState<'today' | 'yesterday' | '7days' | '30days' | 'custom'>('7days');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedManager, setSelectedManager] = useState<string>('ALL');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('ALL');
  const [selectedModule, setSelectedModule] = useState<string>('ALL');
  const [selectedActionType, setSelectedActionType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(20);

  // View mode
  const [viewMode, setViewMode] = useState<'timeline' | 'table'>('timeline');

  // Data states
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [managers, setManagers] = useState<ManagerOption[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Modal inspection
  const [inspectedLog, setInspectedLog] = useState<AuditLogItem | null>(null);

  // Set date ranges on preset change
  useEffect(() => {
    const now = new Date();
    const toDateStr = (d: Date) => d.toISOString().split('T')[0];

    if (datePreset === 'today') {
      const todayStr = toDateStr(now);
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (datePreset === 'yesterday') {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = toDateStr(yesterday);
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (datePreset === '7days') {
      const past = new Date(now);
      past.setDate(past.getDate() - 7);
      setStartDate(toDateStr(past));
      setEndDate(toDateStr(now));
    } else if (datePreset === '30days') {
      const past = new Date(now);
      past.setDate(past.getDate() - 30);
      setStartDate(toDateStr(past));
      setEndDate(toDateStr(now));
    }
  }, [datePreset]);

  // Load static filter options (managers & departments)
  useEffect(() => {
    if (!isSuperAdmin) return;
    async function loadOptions() {
      try {
        const [mgrs, depts] = await Promise.all([
          analyticsApi.getManagers(),
          analyticsApi.getDepartments(),
        ]);
        if (Array.isArray(mgrs)) setManagers(mgrs);
        if (Array.isArray(depts)) setDepartments(depts);
      } catch (err) {
        console.error('Failed to load filter options:', err);
      }
    }
    loadOptions();
  }, [isSuperAdmin]);

  // Fetch Audit Logs and Telemetry Stats
  const fetchData = useCallback(async () => {
    if (!isSuperAdmin) return;
    setLoading(true);
    try {
      const params: AuditLogFilterParams = {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        userId: selectedManager !== 'ALL' ? selectedManager : undefined,
        department: selectedDepartment !== 'ALL' ? selectedDepartment : undefined,
        module: selectedModule !== 'ALL' ? selectedModule : undefined,
        actionType: selectedActionType !== 'ALL' ? selectedActionType : undefined,
        search: searchQuery.trim() || undefined,
        page,
        limit,
      };

      const [logsRes, statsRes] = await Promise.all([
        analyticsApi.getAuditLogs(params),
        analyticsApi.getAuditStats(params),
      ]);

      if (logsRes?.data) {
        setLogs(logsRes.data);
        setPagination(logsRes.pagination || { total: logsRes.data.length, page: 1, limit, totalPages: 1 });
      }
      if (statsRes) {
        setStats(statsRes);
      }
    } catch (err) {
      console.error('Failed to fetch audit data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [
    isSuperAdmin,
    startDate,
    endDate,
    selectedManager,
    selectedDepartment,
    selectedModule,
    selectedActionType,
    searchQuery,
    page,
    limit,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleExportCsv = async () => {
    try {
      await analyticsApi.exportAuditLogs({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        userId: selectedManager !== 'ALL' ? selectedManager : undefined,
        department: selectedDepartment !== 'ALL' ? selectedDepartment : undefined,
        module: selectedModule !== 'ALL' ? selectedModule : undefined,
        actionType: selectedActionType !== 'ALL' ? selectedActionType : undefined,
        search: searchQuery.trim() || undefined,
      });
    } catch (err) {
      alert('Failed to export audit logs');
    }
  };

  const handleResetFilters = () => {
    setDatePreset('7days');
    setSelectedManager('ALL');
    setSelectedDepartment('ALL');
    setSelectedModule('ALL');
    setSelectedActionType('ALL');
    setSearchQuery('');
    setPage(1);
  };

  // Format date helper
  const formatTimestamp = (ts: string) => {
    const d = new Date(ts);
    return {
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };
  };

  // Format relative time helper
  const getRelativeTime = (ts: string) => {
    const diffMs = Date.now() - new Date(ts).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  // Chart Data Preparation
  const timelineChartData = useMemo(() => {
    if (!stats?.timeline || stats.timeline.length === 0) {
      return { labels: [], data: [] };
    }
    return {
      labels: stats.timeline.map((t) => t.date.slice(5)),
      data: stats.timeline.map((t) => t.total),
    };
  }, [stats?.timeline]);

  const moduleChartData = useMemo(() => {
    if (!stats?.moduleBreakdown) {
      return { labels: [], data: [] };
    }
    const filtered = Object.entries(stats.moduleBreakdown).filter(([_, count]) => count > 0);
    return {
      labels: filtered.map(([k]) => k),
      data: filtered.map(([_, v]) => v),
    };
  }, [stats?.moduleBreakdown]);

  // ==========================================
  // ACCESS DENIED VIEW (STRICT RBAC LOCKDOWN)
  // ==========================================
  if (!isSuperAdmin) {
    return (
      <div style={{ padding: '60px 24px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '70vh' }}>
        <div style={{
          maxWidth: '540px',
          width: '100%',
          background: '#ffffff',
          borderRadius: '16px',
          padding: '40px 32px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          border: '1px solid #fee2e2',
          textAlign: 'center',
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            background: '#fef2f2',
            color: '#dc2626',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px auto',
          }}>
            <ShieldAlert size={36} />
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#111827', margin: '0 0 8px 0' }}>
            Access Restricted — Super Admin Only
          </h2>
          <p style={{ fontSize: '14px', color: '#4b5563', lineHeight: '1.6', margin: '0 0 24px 0' }}>
            The Enterprise Telemetry &amp; Audit Trail module contains confidential operational activity logs and is strictly reserved for the <strong>SUPER_ADMIN</strong> role.
          </p>
          <div style={{ background: '#f9fafb', padding: '12px 16px', borderRadius: '8px', fontSize: '13px', color: '#6b7280', marginBottom: '24px' }}>
            Current Authenticated Role: <strong style={{ color: '#111827' }}>{user?.role || 'Unauthenticated'}</strong>
          </div>
          <a
            href="/"
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '10px 16px', fontSize: '14px' }}
          >
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

  // ==========================================
  // SUPER ADMIN DASHBOARD VIEW
  // ==========================================
  return (
    <div className="fade-in" style={{ paddingBottom: '60px' }}>
      {/* Top Header */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '24px',
        background: '#ffffff',
        padding: '20px 24px',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: 0 }}>
              Super Admin Analytics &amp; Activity Trail
            </h1>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              background: '#ecfdf5',
              color: '#065f46',
              fontSize: '11px',
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: '9999px',
              border: '1px solid #a7f3d0',
            }}>
              <ShieldCheck size={12} /> SUPER_ADMIN SECURED
            </span>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              background: '#f0fdf4',
              color: '#16a34a',
              fontSize: '11px',
              fontWeight: 600,
              padding: '3px 8px',
              borderRadius: '9999px',
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }} />
              Live Telemetry
            </span>
          </div>
          <p style={{ fontSize: '13.5px', color: '#6b7280', margin: 0 }}>
            Comprehensive audit logs and operational timeline of all department managers with zero mocking.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '8px 14px' }}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            onClick={handleExportCsv}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '8px 14px' }}
          >
            <Download size={14} />
            Export Audit Trail (CSV)
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '16px',
        marginBottom: '24px',
      }}>
        {/* Total Operations */}
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Total Operations Logged
            </span>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Activity size={20} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#111827' }}>
            {stats?.totalEvents?.toLocaleString() || 0}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '6px' }}>
            In selected range ({startDate || 'All'} to {endDate || 'Now'})
          </div>
        </div>

        {/* Active Managers */}
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Active Management Accounts
            </span>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={20} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#111827' }}>
            {stats?.activeManagersCount || 0}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '6px' }}>
            Distinct managers executing actions
          </div>
        </div>

        {/* Action Type Breakdown */}
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Action Breakdown
            </span>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#fdf4ff', color: '#a855f7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <SlidersHorizontal size={20} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#065f46', background: '#d1fae5', padding: '2px 8px', borderRadius: '6px' }}>
              +{stats?.actionBreakdown?.CREATE || 0} Creates
            </span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#1e40af', background: '#dbeafe', padding: '2px 8px', borderRadius: '6px' }}>
              ~{stats?.actionBreakdown?.UPDATE || 0} Updates
            </span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#991b1b', background: '#fee2e2', padding: '2px 8px', borderRadius: '6px' }}>
              -{stats?.actionBreakdown?.DELETE || 0} Deletes
            </span>
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>
            Real mutation distribution
          </div>
        </div>

        {/* Most Active Module */}
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Peak Activity Module
            </span>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#fff7ed', color: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layers size={20} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#111827' }}>
            {stats?.mostActiveModule || 'None'}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '6px' }}>
            Highest operational volume module
          </div>
        </div>
      </div>

      {/* Visual Activity Charts */}
      {stats && stats.totalEvents > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}>
          {/* Daily Activity Volume Chart */}
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#111827', margin: '0 0 2px 0' }}>
                  Daily Activity Trend
                </h3>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>Total management mutations over time</span>
              </div>
              <BarChart2 size={18} color="#6b7280" />
            </div>
            <div style={{ height: '180px' }}>
              <BarChart
                labels={timelineChartData.labels}
                datasets={[{ label: 'Audit Operations', data: timelineChartData.data }]}
              />
            </div>
          </div>

          {/* Module Breakdown Chart */}
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#111827', margin: '0 0 2px 0' }}>
                  Operational Module Distribution
                </h3>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>Activity share across departments</span>
              </div>
              <TrendingUp size={18} color="#6b7280" />
            </div>
            <div style={{ height: '180px' }}>
              <DoughnutChart labels={moduleChartData.labels} dataPoints={moduleChartData.data} />
            </div>
          </div>
        </div>
      )}

      {/* Filter Controls Bar */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        padding: '20px',
        border: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
        marginBottom: '20px',
      }}>
        {/* Date Presets Row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#4b5563', marginRight: '4px' }}>
            Time Horizon:
          </span>
          {(['today', 'yesterday', '7days', '30days', 'custom'] as const).map((p) => {
            const labels: Record<string, string> = {
              today: 'Today',
              yesterday: 'Yesterday',
              '7days': 'Last 7 Days',
              '30days': 'Last 30 Days',
              custom: 'Custom Range',
            };
            const active = datePreset === p;
            return (
              <button
                key={p}
                onClick={() => setDatePreset(p)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '12.5px',
                  fontWeight: active ? 600 : 500,
                  border: active ? '1px solid #2563eb' : '1px solid #e5e7eb',
                  background: active ? '#eff6ff' : '#ffffff',
                  color: active ? '#1d4ed8' : '#4b5563',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {labels[p]}
              </button>
            );
          })}
        </div>

        {/* Dynamic Filters Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          alignItems: 'center',
        }}>
          {/* Start Date */}
          <div>
            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#6b7280', marginBottom: '4px' }}>
              From Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setDatePreset('custom');
              }}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                fontSize: '13px',
                color: '#111827',
              }}
            />
          </div>

          {/* End Date */}
          <div>
            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#6b7280', marginBottom: '4px' }}>
              To Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setDatePreset('custom');
              }}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                fontSize: '13px',
                color: '#111827',
              }}
            />
          </div>

          {/* Manager / Account Dropdown */}
          <div>
            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#6b7280', marginBottom: '4px' }}>
              Manager / User Account
            </label>
            <select
              value={selectedManager}
              onChange={(e) => {
                setSelectedManager(e.target.value);
                setPage(1);
              }}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                fontSize: '13px',
                color: '#111827',
                background: '#ffffff',
              }}
            >
              <option value="ALL">All Managers &amp; Users</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.displayName} ({m.role}) — {m.department}
                </option>
              ))}
            </select>
          </div>

          {/* Department Dropdown */}
          <div>
            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#6b7280', marginBottom: '4px' }}>
              Department
            </label>
            <select
              value={selectedDepartment}
              onChange={(e) => {
                setSelectedDepartment(e.target.value);
                setPage(1);
              }}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                fontSize: '13px',
                color: '#111827',
                background: '#ffffff',
              }}
            >
              <option value="ALL">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Module Dropdown */}
          <div>
            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#6b7280', marginBottom: '4px' }}>
              Module
            </label>
            <select
              value={selectedModule}
              onChange={(e) => {
                setSelectedModule(e.target.value);
                setPage(1);
              }}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                fontSize: '13px',
                color: '#111827',
                background: '#ffffff',
              }}
            >
              <option value="ALL">All Modules</option>
              <option value="HR">HR Management</option>
              <option value="INVENTORY">Inventory</option>
              <option value="FINANCE">Finance</option>
              <option value="CRM">CRM</option>
              <option value="PROJECTS">Projects</option>
              <option value="ADMIN">Admin / Users</option>
              <option value="SETTINGS">Settings</option>
            </select>
          </div>

          {/* Action Type Dropdown */}
          <div>
            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#6b7280', marginBottom: '4px' }}>
              Action Type
            </label>
            <select
              value={selectedActionType}
              onChange={(e) => {
                setSelectedActionType(e.target.value);
                setPage(1);
              }}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                fontSize: '13px',
                color: '#111827',
                background: '#ffffff',
              }}
            >
              <option value="ALL">All Action Types</option>
              <option value="CREATE">CREATE (+)</option>
              <option value="UPDATE">UPDATE (~)</option>
              <option value="DELETE">DELETE (-)</option>
              <option value="STATUS_CHANGE">STATUS_CHANGE (✓)</option>
              <option value="LOGIN">LOGIN (→)</option>
            </select>
          </div>
        </div>

        {/* Free Text Search & View Mode Switcher */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          marginTop: '16px',
          flexWrap: 'wrap',
        }}>
          <div style={{ position: 'relative', flex: '1', minWidth: '240px' }}>
            <Search size={16} color="#9ca3af" style={{ position: 'absolute', left: '12px', top: '10px' }} />
            <input
              type="text"
              placeholder="Search by description, target record, entity ID, actor name..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                fontSize: '13px',
                color: '#111827',
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={handleResetFilters}
              style={{
                background: 'none',
                border: 'none',
                color: '#4b5563',
                fontSize: '12.5px',
                fontWeight: 500,
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Reset Filters
            </button>

            {/* View Mode Toggle */}
            <div style={{
              display: 'inline-flex',
              background: '#f3f4f6',
              padding: '3px',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
            }}>
              <button
                onClick={() => setViewMode('timeline')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: viewMode === 'timeline' ? 600 : 500,
                  background: viewMode === 'timeline' ? '#ffffff' : 'transparent',
                  color: viewMode === 'timeline' ? '#111827' : '#6b7280',
                  boxShadow: viewMode === 'timeline' ? '0 1px 2px 0 rgba(0, 0, 0, 0.05)' : 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Timeline View
              </button>
              <button
                onClick={() => setViewMode('table')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: viewMode === 'table' ? 600 : 500,
                  background: viewMode === 'table' ? '#ffffff' : 'transparent',
                  color: viewMode === 'table' ? '#111827' : '#6b7280',
                  boxShadow: viewMode === 'table' ? '0 1px 2px 0 rgba(0, 0, 0, 0.05)' : 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Data Table View
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '60px',
          textAlign: 'center',
          border: '1px solid #e5e7eb',
          color: '#6b7280',
        }}>
          <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 12px auto', color: '#2563eb' }} />
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#111827' }}>Loading Activity Trail...</div>
          <p style={{ fontSize: '13px', margin: '4px 0 0 0' }}>Retrieving live audit telemetry from database</p>
        </div>
      ) : logs.length === 0 ? (
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '60px 20px',
          textAlign: 'center',
          border: '1px solid #e5e7eb',
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: '#f3f4f6',
            color: '#9ca3af',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto',
          }}>
            <Activity size={24} />
          </div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: '0 0 6px 0' }}>
            No Audit Logs Found
          </h3>
          <p style={{ fontSize: '13.5px', color: '#6b7280', margin: '0 0 16px 0' }}>
            No management operations match the selected date range and filter criteria.
          </p>
          <button onClick={handleResetFilters} className="btn btn-secondary" style={{ fontSize: '13px' }}>
            Clear Filters
          </button>
        </div>
      ) : viewMode === 'timeline' ? (
        /* TIMELINE VIEW */
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '24px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#374151' }}>
              Showing {logs.length} of {pagination.total} audit events
            </div>
            <div style={{ fontSize: '12.5px', color: '#6b7280' }}>
              Page {pagination.page} of {pagination.totalPages}
            </div>
          </div>

          <div style={{ position: 'relative', paddingLeft: '32px' }}>
            {/* Timeline Vertical Bar */}
            <div style={{
              position: 'absolute',
              left: '11px',
              top: '8px',
              bottom: '8px',
              width: '2px',
              background: '#e5e7eb',
            }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {logs.map((log) => {
                const actionMeta = ACTION_COLORS[log.actionType] || ACTION_COLORS.OTHER;
                const ActionIcon = actionMeta.icon;
                const moduleColor = MODULE_COLORS[log.module] || MODULE_COLORS.OTHER;
                const ts = formatTimestamp(log.timestamp);
                const relTime = getRelativeTime(log.timestamp);

                const actorName = log.userName || (log.user?.employee ? `${log.user.employee.firstName} ${log.user.employee.lastName}`.trim() : log.user?.username || log.userEmail || 'System');
                const actorRole = log.role || log.user?.role?.name || 'USER';
                const actorDept = log.department || log.user?.employee?.department?.name || 'General';

                return (
                  <div
                    key={log.id}
                    style={{
                      position: 'relative',
                      background: '#f9fafb',
                      borderRadius: '10px',
                      padding: '16px 20px',
                      border: '1px solid #e5e7eb',
                      transition: 'box-shadow 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05)')}
                    onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
                  >
                    {/* Node Dot on vertical line */}
                    <div style={{
                      position: 'absolute',
                      left: '-28px',
                      top: '20px',
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      background: actionMeta.bg,
                      border: `2px solid ${actionMeta.text}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: actionMeta.text }} />
                    </div>

                    {/* Event Content Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        {/* Action Badge */}
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          background: actionMeta.bg,
                          color: actionMeta.text,
                          border: `1px solid ${actionMeta.border}`,
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '6px',
                        }}>
                          <ActionIcon size={12} />
                          {log.actionType}
                        </span>

                        {/* Module Badge */}
                        <span style={{
                          display: 'inline-block',
                          background: '#ffffff',
                          color: moduleColor,
                          border: `1px solid ${moduleColor}30`,
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '6px',
                        }}>
                          {log.module}
                        </span>

                        {log.entityType && (
                          <span style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563' }}>
                            {log.entityType} {log.entityId ? `#${log.entityId.slice(0, 8)}` : ''}
                          </span>
                        )}
                      </div>

                      {/* Timestamp */}
                      <div style={{ fontSize: '12px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={13} />
                        <span>{ts.date} at {ts.time}</span>
                        <span style={{ fontWeight: 600, color: '#9ca3af' }}>({relTime})</span>
                      </div>
                    </div>

                    {/* Description */}
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '10px' }}>
                      {log.description}
                    </div>

                    {/* Actor Details Footer */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '8px',
                      paddingTop: '10px',
                      borderTop: '1px solid #e5e7eb',
                      fontSize: '12px',
                      color: '#4b5563',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: '#2563eb',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: 'bold',
                        }}>
                          {actorName.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 600, color: '#111827' }}>{actorName}</span>
                        <span style={{ color: '#9ca3af' }}>•</span>
                        <span style={{ color: '#6b7280' }}>{actorRole}</span>
                        <span style={{ color: '#9ca3af' }}>•</span>
                        <span style={{ color: '#6b7280' }}>{actorDept}</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {log.ipAddress && (
                          <span style={{ color: '#9ca3af', fontFamily: 'monospace', fontSize: '11px' }}>
                            IP: {log.ipAddress}
                          </span>
                        )}
                        <button
                          onClick={() => setInspectedLog(log)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: '#ffffff',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            padding: '3px 8px',
                            fontSize: '11.5px',
                            fontWeight: 600,
                            color: '#374151',
                            cursor: 'pointer',
                          }}
                        >
                          <Eye size={12} /> Inspect
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* DATA TABLE VIEW */
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
          overflow: 'hidden',
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#4b5563', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '12px 16px' }}>Timestamp</th>
                  <th style={{ padding: '12px 16px' }}>Manager / Actor</th>
                  <th style={{ padding: '12px 16px' }}>Role &amp; Dept</th>
                  <th style={{ padding: '12px 16px' }}>Action</th>
                  <th style={{ padding: '12px 16px' }}>Module</th>
                  <th style={{ padding: '12px 16px' }}>Description</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Inspect</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const actionMeta = ACTION_COLORS[log.actionType] || ACTION_COLORS.OTHER;
                  const ActionIcon = actionMeta.icon;
                  const ts = formatTimestamp(log.timestamp);
                  const actorName = log.userName || (log.user?.employee ? `${log.user.employee.firstName} ${log.user.employee.lastName}`.trim() : log.user?.username || log.userEmail || 'System');
                  const actorRole = log.role || log.user?.role?.name || 'USER';
                  const actorDept = log.department || log.user?.employee?.department?.name || 'General';

                  return (
                    <tr key={log.id} style={{ borderBottom: '1px solid #f3f4f6', transition: 'background 0.15s ease' }}>
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', color: '#6b7280' }}>
                        <div style={{ fontWeight: 600, color: '#111827' }}>{ts.date}</div>
                        <div style={{ fontSize: '11.5px', color: '#9ca3af' }}>{ts.time}</div>
                      </td>
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 600, color: '#111827' }}>{actorName}</div>
                        <div style={{ fontSize: '11.5px', color: '#6b7280' }}>{log.userEmail || ''}</div>
                      </td>
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        <span style={{ display: 'inline-block', fontSize: '11px', fontWeight: 600, color: '#374151', background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px', marginRight: '4px' }}>
                          {actorRole}
                        </span>
                        <div style={{ fontSize: '11.5px', color: '#6b7280', marginTop: '2px' }}>{actorDept}</div>
                      </td>
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          background: actionMeta.bg,
                          color: actionMeta.text,
                          border: `1px solid ${actionMeta.border}`,
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '6px',
                        }}>
                          <ActionIcon size={12} />
                          {log.actionType}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        <span style={{
                          display: 'inline-block',
                          background: '#ffffff',
                          color: MODULE_COLORS[log.module] || '#4b5563',
                          border: `1px solid ${(MODULE_COLORS[log.module] || '#4b5563')}30`,
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '6px',
                        }}>
                          {log.module}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', maxWidth: '300px' }}>
                        <div style={{ fontWeight: 500, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {log.description}
                        </div>
                        {log.entityId && (
                          <div style={{ fontSize: '11px', color: '#9ca3af', fontFamily: 'monospace' }}>
                            ID: {log.entityId}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          onClick={() => setInspectedLog(log)}
                          style={{
                            background: '#ffffff',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            padding: '4px 10px',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#374151',
                            cursor: 'pointer',
                          }}
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '20px',
          background: '#ffffff',
          padding: '14px 20px',
          borderRadius: '10px',
          border: '1px solid #e5e7eb',
        }}>
          <div style={{ fontSize: '13px', color: '#6b7280' }}>
            Showing page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong> ({pagination.total} total events)
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                background: page <= 1 ? '#f9fafb' : '#ffffff',
                color: page <= 1 ? '#9ca3af' : '#374151',
                cursor: page <= 1 ? 'not-allowed' : 'pointer',
                fontSize: '12.5px',
                fontWeight: 500,
              }}
            >
              <ChevronLeft size={14} /> Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                background: page >= pagination.totalPages ? '#f9fafb' : '#ffffff',
                color: page >= pagination.totalPages ? '#9ca3af' : '#374151',
                cursor: page >= pagination.totalPages ? 'not-allowed' : 'pointer',
                fontSize: '12.5px',
                fontWeight: 500,
              }}
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {inspectedLog && (() => {
        const actionMeta = ACTION_COLORS[inspectedLog.actionType] || ACTION_COLORS.OTHER;
        const ActionIcon = actionMeta.icon;
        const moduleColor = MODULE_COLORS[inspectedLog.module] || MODULE_COLORS.OTHER;
        const ts = formatTimestamp(inspectedLog.timestamp);
        const relTime = getRelativeTime(inspectedLog.timestamp);
        const actorName = inspectedLog.userName || (inspectedLog.user?.employee ? `${inspectedLog.user.employee.firstName} ${inspectedLog.user.employee.lastName}`.trim() : inspectedLog.user?.username || inspectedLog.userEmail || 'System');
        const actorRole = inspectedLog.role || inspectedLog.user?.role?.name || 'USER';
        const actorDept = inspectedLog.department || inspectedLog.user?.employee?.department?.name || 'General';
        const actorInitial = actorName.charAt(0).toUpperCase();

        // Parse payload
        let parsedDetails: any = null;
        if (inspectedLog.details) {
          try {
            parsedDetails = typeof inspectedLog.details === 'string' ? JSON.parse(inspectedLog.details) : inspectedLog.details;
          } catch {
            parsedDetails = inspectedLog.details;
          }
        }

        const requestPayload = parsedDetails?.request || (parsedDetails && !parsedDetails.response ? parsedDetails : null);
        const responsePayload = parsedDetails?.response || null;

        return (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.55)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '20px',
            }}
            onClick={(e) => { if (e.target === e.currentTarget) setInspectedLog(null); }}
          >
            <div style={{
              background: '#ffffff',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '720px',
              maxHeight: '92vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e5e7eb',
            }}>
              {/* ── MODAL HEADER ──────────────────────────────────── */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 24px',
                borderBottom: '1px solid #e5e7eb',
                background: '#f9fafb',
                borderTopLeftRadius: '16px',
                borderTopRightRadius: '16px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Activity size={18} color="#2563eb" />
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#111827', margin: 0 }}>
                    Audit Event Inspector
                  </h3>
                </div>
                <button
                  onClick={() => setInspectedLog(null)}
                  style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#6b7280', cursor: 'pointer', padding: '4px 6px', display: 'flex', alignItems: 'center' }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ padding: '24px' }}>

                {/* ── HERO: WHAT HAPPENED ──────────────────────────── */}
                <div style={{
                  background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)',
                  borderRadius: '12px',
                  padding: '20px',
                  border: '1px solid #dbeafe',
                  marginBottom: '20px',
                }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#6b7280', marginBottom: '8px' }}>
                    What Happened
                  </div>
                  <div style={{ fontSize: '17px', fontWeight: 700, color: '#111827', lineHeight: '1.5', marginBottom: '12px' }}>
                    {inspectedLog.description || 'No description available'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: actionMeta.bg,
                      color: actionMeta.text,
                      border: `1px solid ${actionMeta.border}`,
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '3px 10px',
                      borderRadius: '6px',
                    }}>
                      <ActionIcon size={12} />
                      {inspectedLog.actionType}
                    </span>
                    <span style={{
                      display: 'inline-block',
                      background: '#ffffff',
                      color: moduleColor,
                      border: `1px solid ${moduleColor}40`,
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '3px 10px',
                      borderRadius: '6px',
                    }}>
                      {inspectedLog.module} Module
                    </span>
                    {inspectedLog.entityType && (
                      <span style={{
                        display: 'inline-block',
                        background: '#ffffff',
                        color: '#374151',
                        border: '1px solid #e5e7eb',
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '3px 10px',
                        borderRadius: '6px',
                      }}>
                        Entity: {inspectedLog.entityType}
                      </span>
                    )}
                  </div>
                </div>

                {/* ── WHO DID IT ───────────────────────────────────── */}
                <div style={{
                  background: '#ffffff',
                  borderRadius: '10px',
                  padding: '16px',
                  border: '1px solid #e5e7eb',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                }}>
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    background: '#2563eb',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    flexShrink: 0,
                  }}>
                    {actorInitial}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                      <strong style={{ fontSize: '15px', color: '#111827' }}>{actorName}</strong>
                      <span style={{
                        fontSize: '10.5px',
                        fontWeight: 700,
                        background: '#f3f4f6',
                        color: '#374151',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        border: '1px solid #e5e7eb',
                      }}>
                        {actorRole}
                      </span>
                    </div>
                    <div style={{ fontSize: '12.5px', color: '#6b7280' }}>
                      {inspectedLog.userEmail || '—'} · {actorDept}
                    </div>
                  </div>
                </div>

                {/* ── DETAILS GRID ─────────────────────────────────── */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  marginBottom: '16px',
                }}>
                  <div style={{ background: '#f9fafb', padding: '12px 14px', borderRadius: '8px', border: '1px solid #f3f4f6' }}>
                    <span style={{ color: '#9ca3af', display: 'block', fontSize: '10.5px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '4px' }}>Timestamp</span>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>{ts.date} at {ts.time}</div>
                    <div style={{ fontSize: '11px', color: '#6b7280' }}>{relTime}</div>
                  </div>
                  <div style={{ background: '#f9fafb', padding: '12px 14px', borderRadius: '8px', border: '1px solid #f3f4f6' }}>
                    <span style={{ color: '#9ca3af', display: 'block', fontSize: '10.5px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '4px' }}>IP Address</span>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827', fontFamily: 'monospace' }}>{inspectedLog.ipAddress || '—'}</div>
                  </div>
                  <div style={{ background: '#f9fafb', padding: '12px 14px', borderRadius: '8px', border: '1px solid #f3f4f6' }}>
                    <span style={{ color: '#9ca3af', display: 'block', fontSize: '10.5px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '4px' }}>Raw Route</span>
                    <code style={{ fontSize: '12px', color: '#111827', background: '#e5e7eb', padding: '2px 6px', borderRadius: '4px' }}>{inspectedLog.action}</code>
                  </div>
                  {inspectedLog.entityId && (
                    <div style={{ background: '#f9fafb', padding: '12px 14px', borderRadius: '8px', border: '1px solid #f3f4f6' }}>
                      <span style={{ color: '#9ca3af', display: 'block', fontSize: '10.5px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '4px' }}>Entity ID</span>
                      <code style={{ fontSize: '12px', color: '#111827', fontFamily: 'monospace' }}>{inspectedLog.entityId}</code>
                    </div>
                  )}
                </div>

                {/* ── USER AGENT ───────────────────────────────────── */}
                {inspectedLog.userAgent && (
                  <div style={{ marginBottom: '16px' }}>
                    <span style={{ color: '#9ca3af', display: 'block', fontSize: '10.5px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '6px' }}>Client User-Agent</span>
                    <div style={{ background: '#f3f4f6', padding: '8px 12px', borderRadius: '6px', fontSize: '11px', fontFamily: 'monospace', color: '#4b5563', wordBreak: 'break-all', lineHeight: '1.4' }}>
                      {inspectedLog.userAgent}
                    </div>
                  </div>
                )}

                {/* ── MUTATION PAYLOAD (REQUEST + RESPONSE) ────────── */}
                <div>
                  <span style={{ color: '#9ca3af', display: 'block', fontSize: '10.5px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '8px' }}>
                    Sanitized Mutation Payload
                  </span>
                  {parsedDetails ? (
                    <div>
                      {requestPayload && (
                        <div style={{ marginBottom: '10px' }}>
                          <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', marginBottom: '4px' }}>📤 Request Body (What was sent)</div>
                          <pre style={{
                            background: '#0f172a',
                            color: '#e2e8f0',
                            padding: '14px',
                            borderRadius: '8px',
                            fontSize: '11.5px',
                            fontFamily: 'monospace',
                            overflowX: 'auto',
                            maxHeight: '200px',
                            lineHeight: '1.5',
                            margin: 0,
                          }}>
                            {JSON.stringify(requestPayload, null, 2)}
                          </pre>
                        </div>
                      )}
                      {responsePayload && (
                        <div>
                          <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', marginBottom: '4px' }}>📥 Response Summary (What the server returned)</div>
                          <pre style={{
                            background: '#0f172a',
                            color: '#a5f3fc',
                            padding: '14px',
                            borderRadius: '8px',
                            fontSize: '11.5px',
                            fontFamily: 'monospace',
                            overflowX: 'auto',
                            maxHeight: '120px',
                            lineHeight: '1.5',
                            margin: 0,
                          }}>
                            {JSON.stringify(responsePayload, null, 2)}
                          </pre>
                        </div>
                      )}
                      {!requestPayload && !responsePayload && (
                        <pre style={{
                          background: '#0f172a',
                          color: '#e2e8f0',
                          padding: '14px',
                          borderRadius: '8px',
                          fontSize: '11.5px',
                          fontFamily: 'monospace',
                          overflowX: 'auto',
                          maxHeight: '220px',
                          lineHeight: '1.5',
                          margin: 0,
                        }}>
                          {typeof parsedDetails === 'string' ? parsedDetails : JSON.stringify(parsedDetails, null, 2)}
                        </pre>
                      )}
                    </div>
                  ) : (
                    <div style={{
                      background: '#f9fafb',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '16px',
                      textAlign: 'center',
                      color: '#6b7280',
                      fontSize: '13px',
                    }}>
                      No mutation payload was captured for this operation.
                      {inspectedLog.actionType === 'LOGIN' && (
                        <div style={{ fontSize: '11.5px', color: '#9ca3af', marginTop: '4px' }}>
                          Login events do not carry a mutation payload.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* ── MODAL FOOTER ───────────────────────────────────── */}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                padding: '14px 24px',
                borderTop: '1px solid #e5e7eb',
                background: '#f9fafb',
                borderBottomLeftRadius: '16px',
                borderBottomRightRadius: '16px',
              }}>
                <button onClick={() => setInspectedLog(null)} className="btn btn-secondary" style={{ fontSize: '13px' }}>
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
