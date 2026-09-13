import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HrmService } from '../hrm/hrm.service';
import type { RequestUser } from '../hrm/hrm.service';
import * as ExcelJS from 'exceljs';
import { formatDateDMY } from '../common/date-format';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PDFDocument = require('pdfkit');

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  constructor(private prisma: PrismaService, private hrmService: HrmService) {}

  // ========== EXCEL GENERATION ==========

  async exportEmployeesExcel(): Promise<Buffer> {
    const employees = await this.prisma.employee.findMany({
      include: { department: true, designation: true },
      orderBy: { firstName: 'asc' },
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Shuroq ERP';
    const sheet = workbook.addWorksheet('Employees');

    sheet.columns = [
      { header: 'First Name', key: 'firstName', width: 15 },
      { header: 'Last Name', key: 'lastName', width: 15 },
      { header: 'Department', key: 'department', width: 20 },
      { header: 'Designation', key: 'designation', width: 20 },
      { header: 'Type', key: 'empType', width: 12 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Contact', key: 'contact', width: 18 },
      { header: 'Join Date', key: 'joinDate', width: 15 },
    ];

    // Style the header row
    sheet.getRow(1).font = { bold: true, size: 12 };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2563EB' } };
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };

    employees.forEach((emp) => {
      sheet.addRow({
        firstName: emp.firstName,
        lastName: emp.lastName,
        department: emp.department?.name || '',
        designation: emp.designation?.title || '',
        empType: emp.empType,
        status: emp.status,
        contact: emp.contact || '',
        joinDate: formatDateDMY(emp.joinDate, ''),
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async exportProductsExcel(): Promise<Buffer> {
    const products = await this.prisma.product.findMany({ orderBy: { name: 'asc' } });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Products');

    sheet.columns = [
      { header: 'Name', key: 'name', width: 25 },
      { header: 'SKU', key: 'sku', width: 15 },
      { header: 'Category', key: 'category', width: 15 },
      { header: 'Price', key: 'price', width: 12 },
      { header: 'Cost Price', key: 'costPrice', width: 12 },
      { header: 'Stock Level', key: 'stockLevel', width: 12 },
      { header: 'Min Stock', key: 'minStockLevel', width: 12 },
      { header: 'Status', key: 'status', width: 10 },
    ];

    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2563EB' } };

    products.forEach((p) => {
      sheet.addRow({
        name: p.name,
        sku: p.sku,
        category: p.category,
        price: p.price,
        costPrice: p.costPrice || 0,
        stockLevel: p.stockLevel,
        minStockLevel: p.minStockLevel,
        status: p.status,
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async exportCustomersExcel(): Promise<Buffer> {
    const customers = await this.prisma.customer.findMany({
      include: { opportunities: true },
      orderBy: { name: 'asc' },
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Customers');

    sheet.columns = [
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Phone', key: 'phone', width: 18 },
      { header: 'Company', key: 'company', width: 20 },
      { header: 'Opportunities', key: 'opportunities', width: 15 },
      { header: 'Created', key: 'createdAt', width: 15 },
    ];

    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2563EB' } };

    customers.forEach((c) => {
      sheet.addRow({
        name: c.name,
        email: c.email || '',
        phone: c.phone || '',
        company: c.company || '',
        opportunities: c.opportunities.length,
        createdAt: formatDateDMY(c.createdAt),
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async exportProjectsExcel(): Promise<Buffer> {
    const projects = await this.prisma.project.findMany({
      include: { tasks: { select: { id: true, status: true } } },
      orderBy: { name: 'asc' },
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Projects');

    sheet.columns = [
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Priority', key: 'priority', width: 12 },
      { header: 'Total Tasks', key: 'totalTasks', width: 12 },
      { header: 'Completed', key: 'completedTasks', width: 12 },
      { header: 'Start Date', key: 'startDate', width: 15 },
      { header: 'End Date', key: 'endDate', width: 15 },
    ];

    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2563EB' } };

    projects.forEach((p) => {
      sheet.addRow({
        name: p.name,
        status: p.status,
        priority: p.priority,
        totalTasks: p.tasks.length,
        completedTasks: p.tasks.filter(t => t.status === 'DONE').length,
        startDate: formatDateDMY(p.startDate, ''),
        endDate: formatDateDMY(p.endDate, ''),
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async exportLedgerExcel(): Promise<Buffer> {
    const entries = await this.prisma.ledgerEntry.findMany({ orderBy: { date: 'desc' } });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('General Ledger');

    sheet.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Account', key: 'account', width: 25 },
      { header: 'Type', key: 'type', width: 10 },
      { header: 'Amount', key: 'amount', width: 15 },
      { header: 'Description', key: 'description', width: 30 },
    ];

    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2563EB' } };

    entries.forEach((e) => {
      sheet.addRow({
        date: formatDateDMY(e.date),
        account: e.account,
        type: e.type,
        amount: e.amount,
        description: e.description || '',
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async exportExpensesExcel(): Promise<Buffer> {
    const expenses = await this.prisma.expense.findMany({ orderBy: { date: 'desc' } });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Expenses');

    sheet.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Category', key: 'category', width: 15 },
      { header: 'Amount', key: 'amount', width: 15 },
      { header: 'Description', key: 'description', width: 30 },
      { header: 'Status', key: 'status', width: 12 },
    ];

    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2563EB' } };

    expenses.forEach((e) => {
      sheet.addRow({
        date: formatDateDMY(e.date),
        category: e.category,
        amount: e.amount,
        description: e.description || '',
        status: e.status,
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  // ========== PDF GENERATION ==========

  async exportEmployeesPdf(): Promise<Buffer> {
    const employees = await this.prisma.employee.findMany({
      include: { department: true, designation: true },
      orderBy: { firstName: 'asc' },
    });

    return new Promise((resolve) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      // Title
      doc.fontSize(20).font('Helvetica-Bold').text('Employee Report', { align: 'center' });
      doc.fontSize(10).font('Helvetica').text(`Generated: ${formatDateDMY(new Date())}`, { align: 'center' });
      doc.moveDown(2);

      // Table header
      const startX = 40;
      let y = doc.y;

      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Name', startX, y, { width: 120 });
      doc.text('Department', startX + 120, y, { width: 100 });
      doc.text('Designation', startX + 220, y, { width: 120 });
      doc.text('Status', startX + 340, y, { width: 70 });
      doc.text('Type', startX + 410, y, { width: 80 });

      y += 20;
      doc.moveTo(startX, y).lineTo(530, y).stroke();
      y += 5;

      // Table rows
      doc.font('Helvetica').fontSize(9);
      employees.forEach((emp) => {
        if (y > 750) {
          doc.addPage();
          y = 40;
        }

        doc.text(`${emp.firstName} ${emp.lastName}`, startX, y, { width: 120 });
        doc.text(emp.department?.name || '-', startX + 120, y, { width: 100 });
        doc.text(emp.designation?.title || '-', startX + 220, y, { width: 120 });
        doc.text(emp.status, startX + 340, y, { width: 70 });
        doc.text(emp.empType, startX + 410, y, { width: 80 });

        y += 18;
      });

      // Footer
      doc.fontSize(8).text(`Total Employees: ${employees.length}`, startX, y + 20);

      doc.end();
    });
  }

  // ========== LEAVES EXPORT ==========
  
  async exportLeavesExcel(): Promise<Buffer> {
    const leaves = await this.prisma.leave.findMany({
      where: { status: { in: ['APPROVED', 'REJECTED'] } },
      include: { employee: { include: { department: true } } },
      orderBy: { startDate: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Shuroq ERP';
    const sheet = workbook.addWorksheet('Leave History');

    sheet.columns = [
      { header: 'Employee', key: 'employee', width: 20 },
      { header: 'Department', key: 'department', width: 15 },
      { header: 'Leave Type', key: 'type', width: 15 },
      { header: 'Start Date', key: 'start', width: 12 },
      { header: 'End Date', key: 'end', width: 12 },
      { header: 'Reason', key: 'reason', width: 25 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Action Time', key: 'actionTime', width: 20 },
    ];

    sheet.getRow(1).font = { bold: true, size: 12 };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2563EB' } };
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };

    leaves.forEach((l) => {
      sheet.addRow({
        employee: `${l.employee.firstName} ${l.employee.lastName}`,
        department: l.employee.department?.name || '-',
        type: l.leaveType.replace(/_/g, ' '),
        start: formatDateDMY(l.startDate),
        end: formatDateDMY(l.endDate),
        reason: l.reason || '-',
        status: l.status,
        actionTime: new Date(l.updatedAt).toLocaleString(),
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async exportLeavesPdf(): Promise<Buffer> {
    const leaves = await this.prisma.leave.findMany({
      where: { status: { in: ['APPROVED', 'REJECTED'] } },
      include: { employee: { include: { department: true } } },
      orderBy: { startDate: 'desc' },
    });

    return new Promise((resolve) => {
      const doc = new PDFDocument({ margin: 20, size: 'A4', layout: 'landscape' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      // Title
      doc.fontSize(20).font('Helvetica-Bold').text('Leave History Report', { align: 'center' });
      doc.fontSize(10).font('Helvetica').text(`Generated: ${formatDateDMY(new Date())}`, { align: 'center' });
      doc.moveDown(2);

      // Table header
      const startX = 20;
      let y = doc.y;

      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Employee', startX, y, { width: 120 });
      doc.text('Dept', startX + 120, y, { width: 80 });
      doc.text('Type', startX + 200, y, { width: 80 });
      doc.text('Dates', startX + 280, y, { width: 120 });
      doc.text('Status', startX + 400, y, { width: 70 });
      doc.text('Action Time', startX + 470, y, { width: 120 });
      doc.text('Reason', startX + 590, y, { width: 200 });

      y += 20;
      doc.moveTo(startX, y).lineTo(800, y).stroke();
      y += 5;

      // Table rows
      doc.font('Helvetica').fontSize(9);
      leaves.forEach((l) => {
        if (y > 500) {
          doc.addPage();
          y = 40;
        }

        const dates = `${formatDateDMY(l.startDate)} - ${formatDateDMY(l.endDate)}`;
        doc.text(`${l.employee.firstName} ${l.employee.lastName}`, startX, y, { width: 120 });
        doc.text(l.employee.department?.name || '-', startX + 120, y, { width: 80 });
        doc.text(l.leaveType.replace(/_/g, ' '), startX + 200, y, { width: 80 });
        doc.text(dates, startX + 280, y, { width: 120 });
        doc.text(l.status, startX + 400, y, { width: 70 });
        doc.text(new Date(l.updatedAt).toLocaleString(), startX + 470, y, { width: 120 });
        doc.text(l.reason || '-', startX + 590, y, { width: 200 });

        y += 18;
      });

      doc.fontSize(8).text(`Total Records: ${leaves.length}`, startX, y + 20);
      doc.end();
    });
  }

  // ========== ATTENDANCE EXPORT ==========

  async exportAttendanceExcel(month: number, year: number): Promise<Buffer> {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    const employees = await this.prisma.employee.findMany({
      where: { status: { not: 'INACTIVE' } },
      include: { department: true },
      orderBy: { firstName: 'asc' },
    });

    const attendance = await this.prisma.attendance.findMany({
      where: { date: { gte: start, lt: end } },
    });

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Shuroq ERP';
    const sheet = workbook.addWorksheet(`Attendance ${monthNames[month - 1]} ${year}`);

    sheet.columns = [
      { header: 'Employee', key: 'employee', width: 22 },
      { header: 'Department', key: 'department', width: 15 },
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Check In', key: 'checkIn', width: 14 },
      { header: 'Check Out', key: 'checkOut', width: 14 },
    ];

    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2563EB' } };

    for (const emp of employees) {
      const empAtt = attendance.filter((a) => a.employeeId === emp.id);
      if (empAtt.length === 0) {
        sheet.addRow({
          employee: `${emp.firstName} ${emp.lastName}`,
          department: emp.department?.name || '-',
          date: '-',
          status: 'NO RECORDS',
          checkIn: '-',
          checkOut: '-',
        });
      } else {
        for (const a of empAtt) {
          sheet.addRow({
            employee: `${emp.firstName} ${emp.lastName}`,
            department: emp.department?.name || '-',
            date: formatDateDMY(a.date),
            status: a.status,
            checkIn: a.checkIn ? new Date(a.checkIn).toLocaleTimeString() : '-',
            checkOut: a.checkOut ? new Date(a.checkOut).toLocaleTimeString() : '-',
          });
        }
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  // ========== SINGLE-EMPLOYEE ATTENDANCE HISTORY EXPORT ==========
  // A date-range export of one person's attendance, built from the exact
  // same day-by-day classification the calendar UI uses (buildAttendanceRange
  // in HrmService) so a row here always matches what's on screen — not a
  // second, independently-computed answer. The range itself is already
  // validated there (can't start before the join date or end after today).

  private readonly ATTENDANCE_STATUS_LABEL: Record<string, string> = {
    PRESENT: 'Present', ABSENT: 'Absent', HALF_DAY: 'Half Day', LATE: 'Late',
    WEEKEND: 'Weekend', HOLIDAY: 'Holiday', NOT_MARKED: 'Not marked yet', NOT_JOINED: 'Not joined yet',
  };

  private async buildAttendanceRangeWorkbook(personLabel: string, days: { date: string; status: string; holidayTitle?: string }[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Shuroq ERP';
    const sheet = workbook.addWorksheet('Attendance History');

    sheet.columns = [
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Day', key: 'day', width: 12 },
      { header: 'Status', key: 'status', width: 16 },
      { header: 'Note', key: 'note', width: 30 },
    ];
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2563EB' } };
    sheet.insertRow(1, [personLabel]);
    sheet.mergeCells('A1:D1');
    sheet.getRow(1).font = { bold: true, size: 13 };
    sheet.getRow(2).font = { bold: true, color: { argb: 'FFFFFF' } };
    sheet.getRow(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2563EB' } };

    for (const d of days) {
      const dateObj = new Date(`${d.date}T00:00:00`);
      sheet.addRow({
        date: formatDateDMY(dateObj),
        day: dateObj.toLocaleDateString(undefined, { weekday: 'long' }),
        status: this.ATTENDANCE_STATUS_LABEL[d.status] || d.status,
        note: d.holidayTitle || '',
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async exportEmployeeAttendanceRangeExcel(employeeId: string, from: string, to: string): Promise<Buffer> {
    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId }, select: { firstName: true, lastName: true } });
    const days = await this.hrmService.getEmployeeAttendanceRange(employeeId, from, to);
    return this.buildAttendanceRangeWorkbook(`${employee?.firstName ?? ''} ${employee?.lastName ?? ''}`.trim(), days);
  }

  async exportSelfAttendanceRangeExcel(viewer: RequestUser | undefined, from: string, to: string): Promise<Buffer> {
    const days = await this.hrmService.getSelfAttendanceRange(viewer, from, to);
    return this.buildAttendanceRangeWorkbook('My Attendance', days);
  }

  async exportAttendancePdf(month: number, year: number): Promise<Buffer> {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    const employees = await this.prisma.employee.findMany({
      where: { status: { not: 'INACTIVE' } },
      include: { department: true },
      orderBy: { firstName: 'asc' },
    });

    const attendance = await this.prisma.attendance.findMany({
      where: { date: { gte: start, lt: end } },
    });

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    return new Promise((resolve) => {
      const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      doc.fontSize(18).font('Helvetica-Bold').text(`Attendance Report — ${monthNames[month - 1]} ${year}`, { align: 'center' });
      doc.fontSize(10).font('Helvetica').text(`Generated: ${formatDateDMY(new Date())}`, { align: 'center' });
      doc.moveDown(2);

      const startX = 30;
      let y = doc.y;

      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Employee', startX, y, { width: 150 });
      doc.text('Department', startX + 150, y, { width: 100 });
      doc.text('Date', startX + 250, y, { width: 100 });
      doc.text('Status', startX + 350, y, { width: 80 });
      doc.text('Check In', startX + 430, y, { width: 100 });
      doc.text('Check Out', startX + 530, y, { width: 100 });

      y += 20;
      doc.moveTo(startX, y).lineTo(750, y).stroke();
      y += 5;

      doc.font('Helvetica').fontSize(9);
      for (const emp of employees) {
        const empAtt = attendance.filter((a) => a.employeeId === emp.id);
        for (const a of empAtt) {
          if (y > 500) { doc.addPage(); y = 40; }
          doc.text(`${emp.firstName} ${emp.lastName}`, startX, y, { width: 150 });
          doc.text(emp.department?.name || '-', startX + 150, y, { width: 100 });
          doc.text(formatDateDMY(a.date), startX + 250, y, { width: 100 });
          doc.text(a.status, startX + 350, y, { width: 80 });
          doc.text(a.checkIn ? new Date(a.checkIn).toLocaleTimeString() : '-', startX + 430, y, { width: 100 });
          doc.text(a.checkOut ? new Date(a.checkOut).toLocaleTimeString() : '-', startX + 530, y, { width: 100 });
          y += 16;
        }
      }

      doc.fontSize(8).text(`Total Employees: ${employees.length}`, startX, y + 20);
      doc.end();
    });
  }
}
