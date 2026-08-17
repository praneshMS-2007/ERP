'use client';

import { selfApi, exportApi } from '../../services/api';
import AttendanceCalendar from '../../components/AttendanceCalendar';
import AttendanceExportButton from '../../components/AttendanceExportButton';

export default function AttendancePage() {
  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>Attendance</h1>
          <p>Your own attendance record — nobody else's is shown here.</p>
        </div>
        <div className="page-header-actions">
          <AttendanceExportButton
            onExport={(from, to) => exportApi.exportSelfAttendanceRange(from, to)}
            description="Choose a date range within your own tracked history — from your join date through today."
          />
        </div>
      </div>
      <AttendanceCalendar fetchMonth={(year, month) => selfApi.getAttendanceCalendar(year, month)} />
    </div>
  );
}
