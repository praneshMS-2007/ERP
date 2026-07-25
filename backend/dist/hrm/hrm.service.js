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
Object.defineProperty(exports, "__esModule", { value: true });
exports.HrmService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let HrmService = class HrmService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getEmployees(departmentId, status) {
        const where = {};
        if (departmentId)
            where.departmentId = departmentId;
        if (status)
            where.status = status;
        return this.prisma.employee.findMany({
            where,
            include: {
                department: true,
                designation: true,
                user: { select: { email: true, role: { select: { name: true } } } },
            },
            orderBy: { joinDate: 'desc' },
        });
    }
    async getEmployeeById(id) {
        const employee = await this.prisma.employee.findUnique({
            where: { id },
            include: {
                department: true,
                designation: true,
                attendances: { take: 5, orderBy: { date: 'desc' } },
                leaves: { take: 5, orderBy: { startDate: 'desc' } },
            },
        });
        if (!employee)
            throw new common_1.NotFoundException('Employee not found');
        return employee;
    }
    async createEmployee(data) {
        return this.prisma.employee.create({ data });
    }
    async updateEmployee(id, data) {
        return this.prisma.employee.update({ where: { id }, data });
    }
    async deleteEmployee(id) {
        await this.prisma.employee.delete({ where: { id } });
        return { message: 'Employee deleted successfully' };
    }
    async getAttendance(employeeId, dateStr) {
        const where = {};
        if (employeeId)
            where.employeeId = employeeId;
        if (dateStr) {
            const date = new Date(dateStr);
            where.date = {
                gte: new Date(date.setHours(0, 0, 0, 0)),
                lt: new Date(date.setHours(23, 59, 59, 999)),
            };
        }
        return this.prisma.attendance.findMany({
            where,
            include: { employee: { select: { firstName: true, lastName: true } } },
            orderBy: { date: 'desc' },
        });
    }
    async markAttendance(data) {
        return this.prisma.attendance.create({ data });
    }
    async getLeaves(status) {
        const where = status ? { status } : {};
        return this.prisma.leave.findMany({
            where,
            include: { employee: { select: { firstName: true, lastName: true, department: true } } },
            orderBy: { startDate: 'desc' },
        });
    }
    async requestLeave(data) {
        return this.prisma.leave.create({ data });
    }
    async updateLeaveStatus(id, status) {
        return this.prisma.leave.update({
            where: { id },
            data: { status },
        });
    }
};
exports.HrmService = HrmService;
exports.HrmService = HrmService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], HrmService);
//# sourceMappingURL=hrm.service.js.map