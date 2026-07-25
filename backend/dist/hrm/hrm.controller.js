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
};
exports.HrmController = HrmController;
__decorate([
    (0, common_1.Get)('employees'),
    __param(0, (0, common_1.Query)('departmentId')),
    __param(1, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], HrmController.prototype, "getEmployees", null);
__decorate([
    (0, common_1.Get)('employees/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], HrmController.prototype, "getEmployeeById", null);
__decorate([
    (0, common_1.Post)('employees'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], HrmController.prototype, "createEmployee", null);
__decorate([
    (0, common_1.Put)('employees/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], HrmController.prototype, "updateEmployee", null);
__decorate([
    (0, common_1.Delete)('employees/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], HrmController.prototype, "deleteEmployee", null);
__decorate([
    (0, common_1.Get)('attendance'),
    __param(0, (0, common_1.Query)('employeeId')),
    __param(1, (0, common_1.Query)('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], HrmController.prototype, "getAttendance", null);
__decorate([
    (0, common_1.Post)('attendance'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], HrmController.prototype, "markAttendance", null);
__decorate([
    (0, common_1.Get)('leaves'),
    __param(0, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], HrmController.prototype, "getLeaves", null);
__decorate([
    (0, common_1.Post)('leaves'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], HrmController.prototype, "requestLeave", null);
__decorate([
    (0, common_1.Put)('leaves/:id/status'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], HrmController.prototype, "updateLeaveStatus", null);
exports.HrmController = HrmController = __decorate([
    (0, common_1.Controller)('hrm'),
    __metadata("design:paramtypes", [hrm_service_1.HrmService])
], HrmController);
//# sourceMappingURL=hrm.controller.js.map