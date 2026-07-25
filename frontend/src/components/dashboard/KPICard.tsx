import React from 'react';

interface KPICardProps {
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
  icon: React.ReactNode;
  iconColor: 'purple' | 'teal' | 'green' | 'amber' | 'red' | 'orange';
}

export default function KPICard({ title, value, change, isPositive, icon, iconColor }: KPICardProps) {
  return (
    <div className="kpi-card" style={{"--card-color": `var(--${iconColor})`} as any}>
      <div className="kpi-header">
        <div className="kpi-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: `var(--${iconColor})` }}>
            {icon}
          </svg>
        </div>
        <span className={`kpi-badge ${isPositive ? 'up' : 'down'}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" style={{ marginRight: '4px' }}>
            {isPositive ? (
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
            ) : (
              <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
            )}
            {isPositive ? (
              <polyline points="17 6 23 6 23 12" />
            ) : (
              <polyline points="17 18 23 18 23 12" />
            )}
          </svg>
          {change}
        </span>
      </div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-label">{title}</div>
    </div>
  );
}
