"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ExportService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExportService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const ExcelJS = __importStar(require("exceljs"));
const PDFDocument = require('pdfkit');
let ExportService = ExportService_1 = class ExportService {
    prisma;
    logger = new common_1.Logger(ExportService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async exportEmployeesExcel() {
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
                joinDate: emp.joinDate ? new Date(emp.joinDate).toLocaleDateString() : '',
            });
        });
        const buffer = await workbook.xlsx.writeBuffer();
        return Buffer.from(buffer);
    }
    async exportProductsExcel() {
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
    async exportCustomersExcel() {
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
                createdAt: new Date(c.createdAt).toLocaleDateString(),
            });
        });
        const buffer = await workbook.xlsx.writeBuffer();
        return Buffer.from(buffer);
    }
    async exportProjectsExcel() {
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
                startDate: p.startDate ? new Date(p.startDate).toLocaleDateString() : '',
                endDate: p.endDate ? new Date(p.endDate).toLocaleDateString() : '',
            });
        });
        const buffer = await workbook.xlsx.writeBuffer();
        return Buffer.from(buffer);
    }
    async exportLedgerExcel() {
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
                date: new Date(e.date).toLocaleDateString(),
                account: e.account,
                type: e.type,
                amount: e.amount,
                description: e.description || '',
            });
        });
        const buffer = await workbook.xlsx.writeBuffer();
        return Buffer.from(buffer);
    }
    async exportExpensesExcel() {
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
                date: new Date(e.date).toLocaleDateString(),
                category: e.category,
                amount: e.amount,
                description: e.description || '',
                status: e.status,
            });
        });
        const buffer = await workbook.xlsx.writeBuffer();
        return Buffer.from(buffer);
    }
    async exportEmployeesPdf() {
        const employees = await this.prisma.employee.findMany({
            include: { department: true, designation: true },
            orderBy: { firstName: 'asc' },
        });
        return new Promise((resolve) => {
            const doc = new PDFDocument({ margin: 40, size: 'A4' });
            const chunks = [];
            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.fontSize(20).font('Helvetica-Bold').text('Employee Report', { align: 'center' });
            doc.fontSize(10).font('Helvetica').text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });
            doc.moveDown(2);
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
            doc.fontSize(8).text(`Total Employees: ${employees.length}`, startX, y + 20);
            doc.end();
        });
    }
    async exportLeavesExcel() {
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
                start: new Date(l.startDate).toLocaleDateString(),
                end: new Date(l.endDate).toLocaleDateString(),
                reason: l.reason || '-',
                status: l.status,
                actionTime: new Date(l.updatedAt).toLocaleString(),
            });
        });
        const buffer = await workbook.xlsx.writeBuffer();
        return Buffer.from(buffer);
    }
    async exportLeavesPdf() {
        const leaves = await this.prisma.leave.findMany({
            where: { status: { in: ['APPROVED', 'REJECTED'] } },
            include: { employee: { include: { department: true } } },
            orderBy: { startDate: 'desc' },
        });
        return new Promise((resolve) => {
            const doc = new PDFDocument({ margin: 20, size: 'A4', layout: 'landscape' });
            const chunks = [];
            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.fontSize(20).font('Helvetica-Bold').text('Leave History Report', { align: 'center' });
            doc.fontSize(10).font('Helvetica').text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });
            doc.moveDown(2);
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
            doc.font('Helvetica').fontSize(9);
            leaves.forEach((l) => {
                if (y > 500) {
                    doc.addPage();
                    y = 40;
                }
                const dates = `${new Date(l.startDate).toLocaleDateString()} - ${new Date(l.endDate).toLocaleDateString()}`;
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
    async exportAttendanceExcel(month, year) {
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
            }
            else {
                for (const a of empAtt) {
                    sheet.addRow({
                        employee: `${emp.firstName} ${emp.lastName}`,
                        department: emp.department?.name || '-',
                        date: new Date(a.date).toLocaleDateString(),
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
    async exportAttendancePdf(month, year) {
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
            const chunks = [];
            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.fontSize(18).font('Helvetica-Bold').text(`Attendance Report — ${monthNames[month - 1]} ${year}`, { align: 'center' });
            doc.fontSize(10).font('Helvetica').text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });
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
                    if (y > 500) {
                        doc.addPage();
                        y = 40;
                    }
                    doc.text(`${emp.firstName} ${emp.lastName}`, startX, y, { width: 150 });
                    doc.text(emp.department?.name || '-', startX + 150, y, { width: 100 });
                    doc.text(new Date(a.date).toLocaleDateString(), startX + 250, y, { width: 100 });
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
};
exports.ExportService = ExportService;
exports.ExportService = ExportService = ExportService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ExportService);
//# sourceMappingURL=export.service.js.map