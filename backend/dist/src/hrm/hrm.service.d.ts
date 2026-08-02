import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
export declare class HrmService {
    private prisma;
    private readonly logger;
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
            name: string;
            description: string | null;
            createdAt: Date;
            updatedAt: Date;
        };
        designation: {
            id: string;
            description: string | null;
            createdAt: Date;
            updatedAt: Date;
            title: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string | null;
        empCode: string | null;
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
            name: string;
            description: string | null;
            createdAt: Date;
            updatedAt: Date;
        };
        designation: {
            id: string;
            description: string | null;
            createdAt: Date;
            updatedAt: Date;
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
            endDate: Date;
            employeeId: string;
            leaveType: import(".prisma/client").$Enums.LeaveType;
            reason: string;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string | null;
        empCode: string | null;
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
        empCode: string | null;
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
        empCode: string | null;
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
                name: string;
                description: string | null;
                createdAt: Date;
                updatedAt: Date;
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
        endDate: Date;
        employeeId: string;
        leaveType: import(".prisma/client").$Enums.LeaveType;
        reason: string;
    })[]>;
    requestLeave(data: Prisma.LeaveUncheckedCreateInput): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.LeaveStatus;
        startDate: Date;
        endDate: Date;
        employeeId: string;
        leaveType: import(".prisma/client").$Enums.LeaveType;
        reason: string;
    }>;
    updateLeaveStatus(id: string, status: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.LeaveStatus;
        startDate: Date;
        endDate: Date;
        employeeId: string;
        leaveType: import(".prisma/client").$Enums.LeaveType;
        reason: string;
    }>;
    getPayrolls(): Promise<({
        employee: {
            designation: {
                title: string;
            };
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.PayrollStatus;
        employeeId: string;
        baseSalary: number;
        bonus: number;
        deductions: number;
        netPay: number;
        payPeriod: string;
        paymentDate: Date | null;
    })[]>;
    createPayroll(data: Prisma.PayrollUncheckedCreateInput): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.PayrollStatus;
        employeeId: string;
        baseSalary: number;
        bonus: number;
        deductions: number;
        netPay: number;
        payPeriod: string;
        paymentDate: Date | null;
    }>;
    updatePayrollStatus(id: string, status: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.PayrollStatus;
        employeeId: string;
        baseSalary: number;
        bonus: number;
        deductions: number;
        netPay: number;
        payPeriod: string;
        paymentDate: Date | null;
    }>;
    getJobPostings(): Promise<({
        _count: {
            applicants: number;
        };
    } & {
        id: string;
        description: string;
        createdAt: Date;
        updatedAt: Date;
        department: string;
        title: string;
        status: import(".prisma/client").$Enums.JobStatus;
        priority: import(".prisma/client").$Enums.Priority;
        location: string;
    })[]>;
    createJobPosting(data: Prisma.JobPostingUncheckedCreateInput): Promise<{
        id: string;
        description: string;
        createdAt: Date;
        updatedAt: Date;
        department: string;
        title: string;
        status: import(".prisma/client").$Enums.JobStatus;
        priority: import(".prisma/client").$Enums.Priority;
        location: string;
    }>;
    getApplicants(): Promise<({
        job: {
            department: string;
            title: string;
        };
    } & {
        id: string;
        name: string;
        updatedAt: Date;
        email: string;
        status: import(".prisma/client").$Enums.ApplicantStatus;
        phone: string | null;
        jobId: string;
        resumeUrl: string | null;
        appliedAt: Date;
    })[]>;
    createApplicant(data: Prisma.ApplicantUncheckedCreateInput): Promise<{
        id: string;
        name: string;
        updatedAt: Date;
        email: string;
        status: import(".prisma/client").$Enums.ApplicantStatus;
        phone: string | null;
        jobId: string;
        resumeUrl: string | null;
        appliedAt: Date;
    }>;
    updateApplicantStatus(id: string, status: any): Promise<{
        id: string;
        name: string;
        updatedAt: Date;
        email: string;
        status: import(".prisma/client").$Enums.ApplicantStatus;
        phone: string | null;
        jobId: string;
        resumeUrl: string | null;
        appliedAt: Date;
    }>;
    getPerformanceReviews(): Promise<({
        employee: {
            department: {
                id: string;
                name: string;
                description: string | null;
                createdAt: Date;
                updatedAt: Date;
            };
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        employeeId: string;
        quarter: string;
        rating: number;
        review: string;
        goals: string | null;
        reviewerId: string;
    })[]>;
    getAttendanceStats(dateStr: string): Promise<{
        present: number;
        absent: number;
        total: number;
        date: string;
    }>;
    getMonthlyAttendanceTrend(year: number): Promise<{
        year: number;
        totalEmployees: number;
        data: {
            month: number;
            monthName: string;
            present: number;
            absent: number;
        }[];
    }>;
}
