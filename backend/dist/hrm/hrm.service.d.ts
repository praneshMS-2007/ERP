import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
export declare class HrmService {
    private prisma;
    constructor(prisma: PrismaService);
    getEmployees(departmentId?: string, status?: any): Promise<({
        user: {
            role: {
                name: string;
            };
            email: string;
        } | null;
        department: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            description: string | null;
        };
        designation: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            title: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string | null;
        firstName: string;
        lastName: string;
        gender: string | null;
        dob: Date | null;
        contact: string | null;
        address: string | null;
        city: string | null;
        state: string | null;
        country: string | null;
        joinDate: Date;
        empType: import(".prisma/client").$Enums.EmpType;
        status: import(".prisma/client").$Enums.EmpStatus;
        departmentId: string;
        designationId: string;
    })[]>;
    getEmployeeById(id: string): Promise<{
        department: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            description: string | null;
        };
        designation: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            title: string;
        };
        attendances: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.AttendanceStatus;
            date: Date;
            employeeId: string;
            checkIn: Date | null;
            checkOut: Date | null;
            hoursWorked: number | null;
        }[];
        leaves: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.LeaveStatus;
            startDate: Date;
            employeeId: string;
            leaveType: import(".prisma/client").$Enums.LeaveType;
            endDate: Date;
            reason: string;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string | null;
        firstName: string;
        lastName: string;
        gender: string | null;
        dob: Date | null;
        contact: string | null;
        address: string | null;
        city: string | null;
        state: string | null;
        country: string | null;
        joinDate: Date;
        empType: import(".prisma/client").$Enums.EmpType;
        status: import(".prisma/client").$Enums.EmpStatus;
        departmentId: string;
        designationId: string;
    }>;
    createEmployee(data: Prisma.EmployeeUncheckedCreateInput): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string | null;
        firstName: string;
        lastName: string;
        gender: string | null;
        dob: Date | null;
        contact: string | null;
        address: string | null;
        city: string | null;
        state: string | null;
        country: string | null;
        joinDate: Date;
        empType: import(".prisma/client").$Enums.EmpType;
        status: import(".prisma/client").$Enums.EmpStatus;
        departmentId: string;
        designationId: string;
    }>;
    updateEmployee(id: string, data: Prisma.EmployeeUncheckedUpdateInput): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string | null;
        firstName: string;
        lastName: string;
        gender: string | null;
        dob: Date | null;
        contact: string | null;
        address: string | null;
        city: string | null;
        state: string | null;
        country: string | null;
        joinDate: Date;
        empType: import(".prisma/client").$Enums.EmpType;
        status: import(".prisma/client").$Enums.EmpStatus;
        departmentId: string;
        designationId: string;
    }>;
    deleteEmployee(id: string): Promise<{
        message: string;
    }>;
    getAttendance(employeeId?: string, dateStr?: string): Promise<({
        employee: {
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.AttendanceStatus;
        date: Date;
        employeeId: string;
        checkIn: Date | null;
        checkOut: Date | null;
        hoursWorked: number | null;
    })[]>;
    markAttendance(data: Prisma.AttendanceUncheckedCreateInput): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.AttendanceStatus;
        date: Date;
        employeeId: string;
        checkIn: Date | null;
        checkOut: Date | null;
        hoursWorked: number | null;
    }>;
    getLeaves(status?: any): Promise<({
        employee: {
            department: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                description: string | null;
            };
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.LeaveStatus;
        startDate: Date;
        employeeId: string;
        leaveType: import(".prisma/client").$Enums.LeaveType;
        endDate: Date;
        reason: string;
    })[]>;
    requestLeave(data: Prisma.LeaveUncheckedCreateInput): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.LeaveStatus;
        startDate: Date;
        employeeId: string;
        leaveType: import(".prisma/client").$Enums.LeaveType;
        endDate: Date;
        reason: string;
    }>;
    updateLeaveStatus(id: string, status: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.LeaveStatus;
        startDate: Date;
        employeeId: string;
        leaveType: import(".prisma/client").$Enums.LeaveType;
        endDate: Date;
        reason: string;
    }>;
}
