import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class HrmService {
  constructor(private prisma: PrismaService) {}

  // ========== EMPLOYEES ==========
  async getEmployees(departmentId?: string, status?: any) {
    const where: any = {};
    if (departmentId) where.departmentId = departmentId;
    if (status) where.status = status;

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

  async getEmployeeById(id: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: {
        department: true,
        designation: true,
        attendances: { take: 5, orderBy: { date: 'desc' } },
        leaves: { take: 5, orderBy: { startDate: 'desc' } },
      },
    });
    if (!employee) throw new NotFoundException('Employee not found');
    return employee;
  }

  async createEmployee(data: Prisma.EmployeeUncheckedCreateInput) {
    return this.prisma.employee.create({ data });
  }

  async updateEmployee(id: string, data: Prisma.EmployeeUncheckedUpdateInput) {
    return this.prisma.employee.update({ where: { id }, data });
  }

  async deleteEmployee(id: string) {
    await this.prisma.employee.delete({ where: { id } });
    return { message: 'Employee deleted successfully' };
  }

  // ========== ATTENDANCE ==========
  async getAttendance(employeeId?: string, dateStr?: string) {
    const where: any = {};
    if (employeeId) where.employeeId = employeeId;
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

  async markAttendance(data: Prisma.AttendanceUncheckedCreateInput) {
    return this.prisma.attendance.create({ data });
  }

  // ========== LEAVES ==========
  async getLeaves(status?: any) {
    const where = status ? { status } : {};
    return this.prisma.leave.findMany({
      where,
      include: { employee: { select: { firstName: true, lastName: true, department: true } } },
      orderBy: { startDate: 'desc' },
    });
  }

  async requestLeave(data: Prisma.LeaveUncheckedCreateInput) {
    return this.prisma.leave.create({ data });
  }

  async updateLeaveStatus(id: string, status: any) {
    return this.prisma.leave.update({
      where: { id },
      data: { status },
    });
  }
}
