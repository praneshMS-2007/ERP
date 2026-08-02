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
exports.HrmController = void 0;
const common_1 = require("@nestjs/common");
const hrm_service_1 = require("./hrm.service");
const client_1 = require("@prisma/client");
const decorators_1 = require("../auth/decorators");
let HrmController = class HrmController {
    hrmService;
    constructor(hrmService) {
        this.hrmService = hrmService;
    }
    getEmployees(departmentId, status) {
        return this.hrmService.getEmployees(departmentId, status);
    }
    getEmployeeById(id) {
        return this.hrmService.getEmployeeById(id);
    }
    createEmployee(data) {
        return this.hrmService.createEmployee(data);
    }
    updateEmployee(id, data) {
        return this.hrmService.updateEmployee(id, data);
    }
    deleteEmployee(id) {
        return this.hrmService.deleteEmployee(id);
    }
    getAttendanceStats(date) {
        return this.hrmService.getAttendanceStats(date || new Date().toISOString().split('T')[0]);
    }
    getAttendanceTrend(year) {
        return this.hrmService.getMonthlyAttendanceTrend(parseInt(year) || new Date().getFullYear());
    }
    getAttendance(employeeId, date) {
        return this.hrmService.getAttendance(employeeId, date);
    }
    markAttendance(data) {
        return this.hrmService.markAttendance(data);
    }
    getLeaves(status) {
        return this.hrmService.getLeaves(status);
    }
    requestLeave(data) {
        return this.hrmService.requestLeave(data);
    }
    updateLeaveStatus(id, status) {
        return this.hrmService.updateLeaveStatus(id, status);
    }
    getPayrolls() {
        return this.hrmService.getPayrolls();
    }
    createPayroll(data) {
        return this.hrmService.createPayroll(data);
    }
    updatePayrollStatus(id, status) {
        return this.hrmService.updatePayrollStatus(id, status);
    }
    getJobPostings() {
        return this.hrmService.getJobPostings();
    }
    createJobPosting(data) {
        return this.hrmService.createJobPosting(data);
    }
    getApplicants() {
        return this.hrmService.getApplicants();
    }
    createApplicant(data) {
        return this.hrmService.createApplicant(data);
    }
    updateApplicantStatus(id, status) {
        return this.hrmService.updateApplicantStatus(id, status);
    }
    getPerformanceReviews() {
        return this.hrmService.getPerformanceReviews();
    }
};
exports.HrmController = HrmController;
__decorate([
    (0, common_1.Get)('employees'),
    (0, decorators_1.RequirePermission)('HR', 'READ'),
    __param(0, (0, common_1.Query)('departmentId')),
    __param(1, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], HrmController.prototype, "getEmployees", null);
__decorate([
    (0, common_1.Get)('employees/:id'),
    (0, decorators_1.RequirePermission)('HR', 'READ'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], HrmController.prototype, "getEmployeeById", null);
__decorate([
    (0, common_1.Post)('employees'),
    (0, decorators_1.RequirePermission)('HR', 'WRITE'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], HrmController.prototype, "createEmployee", null);
__decorate([
    (0, common_1.Put)('employees/:id'),
    (0, decorators_1.RequirePermission)('HR', 'WRITE'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], HrmController.prototype, "updateEmployee", null);
__decorate([
    (0, common_1.Delete)('employees/:id'),
    (0, decorators_1.RequirePermission)('HR', 'DELETE'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], HrmController.prototype, "deleteEmployee", null);
__decorate([
    (0, common_1.Get)('attendance/stats'),
    (0, decorators_1.RequirePermission)('HR', 'READ'),
    __param(0, (0, common_1.Query)('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], HrmController.prototype, "getAttendanceStats", null);
__decorate([
    (0, common_1.Get)('attendance/trend'),
    (0, decorators_1.RequirePermission)('HR', 'READ'),
    __param(0, (0, common_1.Query)('year')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], HrmController.prototype, "getAttendanceTrend", null);
__decorate([
    (0, common_1.Get)('attendance'),
    (0, decorators_1.RequirePermission)('HR', 'READ'),
    __param(0, (0, common_1.Query)('employeeId')),
    __param(1, (0, common_1.Query)('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], HrmController.prototype, "getAttendance", null);
__decorate([
    (0, common_1.Post)('attendance'),
    (0, decorators_1.RequirePermission)('HR', 'WRITE'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], HrmController.prototype, "markAttendance", null);
__decorate([
    (0, common_1.Get)('leaves'),
    (0, decorators_1.RequirePermission)('HR', 'READ'),
    __param(0, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], HrmController.prototype, "getLeaves", null);
__decorate([
    (0, common_1.Post)('leaves'),
    (0, decorators_1.RequirePermission)('HR', 'WRITE'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], HrmController.prototype, "requestLeave", null);
__decorate([
    (0, common_1.Put)('leaves/:id/status'),
    (0, decorators_1.RequirePermission)('HR', 'WRITE'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], HrmController.prototype, "updateLeaveStatus", null);
__decorate([
    (0, common_1.Get)('payrolls'),
    (0, decorators_1.RequirePermission)('HR', 'READ'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], HrmController.prototype, "getPayrolls", null);
__decorate([
    (0, common_1.Post)('payrolls'),
    (0, decorators_1.RequirePermission)('HR', 'WRITE'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], HrmController.prototype, "createPayroll", null);
__decorate([
    (0, common_1.Put)('payrolls/:id/status'),
    (0, decorators_1.RequirePermission)('HR', 'WRITE'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], HrmController.prototype, "updatePayrollStatus", null);
__decorate([
    (0, common_1.Get)('jobs'),
    (0, decorators_1.RequirePermission)('HR', 'READ'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], HrmController.prototype, "getJobPostings", null);
__decorate([
    (0, common_1.Post)('jobs'),
    (0, decorators_1.RequirePermission)('HR', 'WRITE'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], HrmController.prototype, "createJobPosting", null);
__decorate([
    (0, common_1.Get)('applicants'),
    (0, decorators_1.RequirePermission)('HR', 'READ'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], HrmController.prototype, "getApplicants", null);
__decorate([
    (0, common_1.Post)('applicants'),
    (0, decorators_1.RequirePermission)('HR', 'WRITE'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], HrmController.prototype, "createApplicant", null);
__decorate([
    (0, common_1.Put)('applicants/:id/status'),
    (0, decorators_1.RequirePermission)('HR', 'WRITE'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], HrmController.prototype, "updateApplicantStatus", null);
__decorate([
    (0, common_1.Get)('performance-reviews'),
    (0, decorators_1.RequirePermission)('HR', 'READ'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], HrmController.prototype, "getPerformanceReviews", null);
exports.HrmController = HrmController = __decorate([
    (0, common_1.Controller)('hrm'),
    __metadata("design:paramtypes", [hrm_service_1.HrmService])
], HrmController);
//# sourceMappingURL=hrm.controller.js.map