"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExportController = void 0;
const common_1 = require("@nestjs/common");
const export_service_1 = require("./export.service");
const decorators_1 = require("../auth/decorators");
let ExportController = class ExportController {
    exportService;
    constructor(exportService) {
        this.exportService = exportService;
    }
    async exportEmployees(format, res) {
        if (format === 'pdf') {
            const buffer = await this.exportService.exportEmployeesPdf();
            res.set({
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'attachment; filename=employees.pdf',
            });
            return res.send(buffer);
        }
        const buffer = await this.exportService.exportEmployeesExcel();
        res.set({
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': 'attachment; filename=employees.xlsx',
        });
        return res.send(buffer);
    }
    async exportLeaves(format, res) {
        if (format === 'pdf') {
            const buffer = await this.exportService.exportLeavesPdf();
            res.set({
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'attachment; filename=leave_history.pdf',
            });
            return res.send(buffer);
        }
        const buffer = await this.exportService.exportLeavesExcel();
        res.set({
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': 'attachment; filename=leave_history.xlsx',
        });
        return res.send(buffer);
    }
    async exportProducts(format, res) {
        const buffer = await this.exportService.exportProductsExcel();
        res.set({
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': 'attachment; filename=products.xlsx',
        });
        return res.send(buffer);
    }
    async exportCustomers(format, res) {
        const buffer = await this.exportService.exportCustomersExcel();
        res.set({
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': 'attachment; filename=customers.xlsx',
        });
        return res.send(buffer);
    }
    async exportProjects(format, res) {
        const buffer = await this.exportService.exportProjectsExcel();
        res.set({
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': 'attachment; filename=projects.xlsx',
        });
        return res.send(buffer);
    }
    async exportLedger(format, res) {
        const buffer = await this.exportService.exportLedgerExcel();
        res.set({
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': 'attachment; filename=ledger.xlsx',
        });
        return res.send(buffer);
    }
    async exportExpenses(format, res) {
        const buffer = await this.exportService.exportExpensesExcel();
        res.set({
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': 'attachment; filename=expenses.xlsx',
        });
        return res.send(buffer);
    }
    async exportAttendance(format, month, year, res) {
        const m = parseInt(month) || new Date().getMonth() + 1;
        const y = parseInt(year) || new Date().getFullYear();
        if (format === 'pdf') {
            const buffer = await this.exportService.exportAttendancePdf(m, y);
            res.set({
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename=attendance_${m}_${y}.pdf`,
            });
            return res.send(buffer);
        }
        const buffer = await this.exportService.exportAttendanceExcel(m, y);
        res.set({
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename=attendance_${m}_${y}.xlsx`,
        });
        return res.send(buffer);
    }
};
exports.ExportController = ExportController;
__decorate([
    (0, common_1.Get)('employees'),
    (0, decorators_1.RequirePermission)('HR', 'READ'),
    __param(0, (0, common_1.Query)('format')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ExportController.prototype, "exportEmployees", null);
__decorate([
    (0, common_1.Get)('hrm/leaves'),
    (0, decorators_1.RequirePermission)('HR', 'READ'),
    __param(0, (0, common_1.Query)('format')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ExportController.prototype, "exportLeaves", null);
__decorate([
    (0, common_1.Get)('inventory/products'),
    (0, decorators_1.RequirePermission)('INVENTORY', 'READ'),
    __param(0, (0, common_1.Query)('format')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ExportController.prototype, "exportProducts", null);
__decorate([
    (0, common_1.Get)('crm/customers'),
    (0, decorators_1.RequirePermission)('CRM', 'READ'),
    __param(0, (0, common_1.Query)('format')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ExportController.prototype, "exportCustomers", null);
__decorate([
    (0, common_1.Get)('projects'),
    (0, decorators_1.RequirePermission)('PROJECTS', 'READ'),
    __param(0, (0, common_1.Query)('format')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ExportController.prototype, "exportProjects", null);
__decorate([
    (0, common_1.Get)('finance/ledger'),
    (0, decorators_1.RequirePermission)('FINANCE', 'READ'),
    __param(0, (0, common_1.Query)('format')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ExportController.prototype, "exportLedger", null);
__decorate([
    (0, common_1.Get)('finance/expenses'),
    (0, decorators_1.RequirePermission)('FINANCE', 'READ'),
    __param(0, (0, common_1.Query)('format')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ExportController.prototype, "exportExpenses", null);
__decorate([
    (0, common_1.Get)('hrm/attendance'),
    (0, decorators_1.RequirePermission)('HR', 'READ'),
    __param(0, (0, common_1.Query)('format')),
    __param(1, (0, common_1.Query)('month')),
    __param(2, (0, common_1.Query)('year')),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", Promise)
], ExportController.prototype, "exportAttendance", null);
exports.ExportController = ExportController = __decorate([
    (0, common_1.Controller)('export'),
    __metadata("design:paramtypes", [export_service_1.ExportService])
], ExportController);
//# sourceMappingURL=export.controller.js.map