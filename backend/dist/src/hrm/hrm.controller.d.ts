import { HrmService } from './hrm.service';
import { Prisma } from '@prisma/client';
export declare class HrmController {
    private readonly hrmService;
    constructor(hrmService: HrmService);
    getEmployees(departmentId?: string, status?: string): Promise<({
        user: {
            email: string;
            role: {
                name: string;
            };
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
        empCode: string | null;
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
        createdAt: Date;
        updatedAt: Date;
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
            status: import(".prisma/client").$Enums.AttendanceStatus;
            createdAt: Date;
            updatedAt: Date;
            date: Date;
            employeeId: string;
            checkIn: Date | null;
            checkOut: Date | null;
            hoursWorked: number | null;
        }[];
        leaves: {
            id: string;
            status: import(".prisma/client").$Enums.LeaveStatus;
            createdAt: Date;
            updatedAt: Date;
            startDate: Date;
            employeeId: string;
            leaveType: import(".prisma/client").$Enums.LeaveType;
            endDate: Date;
            reason: string;
        }[];
    } & {
        id: string;
        empCode: string | null;
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
        createdAt: Date;
        updatedAt: Date;
    }>;
    createEmployee(data: Prisma.EmployeeUncheckedCreateInput): Promise<{
        id: string;
        empCode: string | null;
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
        createdAt: Date;
        updatedAt: Date;
    }>;
    updateEmployee(id: string, data: Prisma.EmployeeUncheckedUpdateInput): Promise<{
        id: string;
        empCode: string | null;
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
        createdAt: Date;
        updatedAt: Date;
    }>;
    deleteEmployee(id: string): Promise<{
        message: string;
    }>;
    getAttendanceStats(date: string): Promise<{
        present: number;
        absent: number;
        total: number;
        date: string;
    }>;
    getAttendanceTrend(year: string): Promise<{
        year: number;
        totalEmployees: number;
        data: {
            month: number;
            monthName: string;
            present: number;
            absent: number;
        }[];
    }>;
    getAttendance(employeeId?: string, date?: string): Promise<({
        employee: {
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        status: import(".prisma/client").$Enums.AttendanceStatus;
        createdAt: Date;
        updatedAt: Date;
        date: Date;
        employeeId: string;
        checkIn: Date | null;
        checkOut: Date | null;
        hoursWorked: number | null;
    })[]>;
    markAttendance(data: Prisma.AttendanceUncheckedCreateInput): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.AttendanceStatus;
        createdAt: Date;
        updatedAt: Date;
        date: Date;
        employeeId: string;
        checkIn: Date | null;
        checkOut: Date | null;
        hoursWorked: number | null;
    }>;
    getLeaves(status?: string): Promise<({
        employee: {
            firstName: string;
            lastName: string;
            department: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                description: string | null;
            };
        };
    } & {
        id: string;
        status: import(".prisma/client").$Enums.LeaveStatus;
        createdAt: Date;
        updatedAt: Date;
        startDate: Date;
        employeeId: string;
        leaveType: import(".prisma/client").$Enums.LeaveType;
        endDate: Date;
        reason: string;
    })[]>;
    requestLeave(data: Prisma.LeaveUncheckedCreateInput): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.LeaveStatus;
        createdAt: Date;
        updatedAt: Date;
        startDate: Date;
        employeeId: string;
        leaveType: import(".prisma/client").$Enums.LeaveType;
        endDate: Date;
        reason: string;
    }>;
    updateLeaveStatus(id: string, status: any): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.LeaveStatus;
        createdAt: Date;
        updatedAt: Date;
        startDate: Date;
        employeeId: string;
        leaveType: import(".prisma/client").$Enums.LeaveType;
        endDate: Date;
        reason: string;
    }>;
    getPayrolls(): Promise<({
        employee: {
            firstName: string;
            lastName: string;
            designation: {
                title: string;
            };
        };
    } & {
        id: string;
        status: import(".prisma/client").$Enums.PayrollStatus;
        createdAt: Date;
        updatedAt: Date;
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
        status: import(".prisma/client").$Enums.PayrollStatus;
        createdAt: Date;
        updatedAt: Date;
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
        status: import(".prisma/client").$Enums.PayrollStatus;
        createdAt: Date;
        updatedAt: Date;
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
        status: import(".prisma/client").$Enums.JobStatus;
        createdAt: Date;
        updatedAt: Date;
        department: string;
        description: string;
        title: string;
        location: string;
        priority: import(".prisma/client").$Enums.Priority;
    })[]>;
    createJobPosting(data: Prisma.JobPostingUncheckedCreateInput): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.JobStatus;
        createdAt: Date;
        updatedAt: Date;
        department: string;
        description: string;
        title: string;
        location: string;
        priority: import(".prisma/client").$Enums.Priority;
    }>;
    getApplicants(): Promise<({
        job: {
            department: string;
            title: string;
        };
    } & {
        id: string;
        status: import(".prisma/client").$Enums.ApplicantStatus;
        updatedAt: Date;
        email: string;
        name: string;
        jobId: string;
        phone: string | null;
        resumeUrl: string | null;
        appliedAt: Date;
    })[]>;
    createApplicant(data: Prisma.ApplicantUncheckedCreateInput): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.ApplicantStatus;
        updatedAt: Date;
        email: string;
        name: string;
        jobId: string;
        phone: string | null;
        resumeUrl: string | null;
        appliedAt: Date;
    }>;
    updateApplicantStatus(id: string, status: any): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.ApplicantStatus;
        updatedAt: Date;
        email: string;
        name: string;
        jobId: string;
        phone: string | null;
        resumeUrl: string | null;
        appliedAt: Date;
    }>;
    getPerformanceReviews(): Promise<({
        employee: {
            firstName: string;
            lastName: string;
            department: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                description: string | null;
            };
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
}
