import { CrmService } from './crm.service';
import { Prisma } from '@prisma/client';
export declare class CrmController {
    private readonly crmService;
    constructor(crmService: CrmService);
    getLeads(status?: string): Promise<({
        followUps: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            date: Date;
            notes: string;
            nextActionDate: Date | null;
            customerId: string | null;
            leadId: string | null;
        }[];
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        email: string | null;
        status: import(".prisma/client").$Enums.LeadStatus;
        phone: string | null;
        company: string | null;
    })[]>;
    createLead(data: Prisma.LeadCreateInput): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        email: string | null;
        status: import(".prisma/client").$Enums.LeadStatus;
        phone: string | null;
        company: string | null;
    }>;
    updateLead(id: string, data: Prisma.LeadUpdateInput): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        email: string | null;
        status: import(".prisma/client").$Enums.LeadStatus;
        phone: string | null;
        company: string | null;
    }>;
    deleteLead(id: string): Promise<{
        message: string;
    }>;
    convertLeadToCustomer(id: string): Promise<{
        message: string;
        customer: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            email: string | null;
            phone: string | null;
            company: string | null;
            convertedFromLeadId: string | null;
        };
    }>;
    getCustomers(): Promise<({
        lead: {
            name: string;
            status: import(".prisma/client").$Enums.LeadStatus;
        } | null;
        opportunities: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            customerId: string;
            stage: import(".prisma/client").$Enums.OpportunityStage;
            value: number;
            expectedCloseDate: Date | null;
        }[];
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        email: string | null;
        phone: string | null;
        company: string | null;
        convertedFromLeadId: string | null;
    })[]>;
    createCustomer(data: Prisma.CustomerCreateInput): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        email: string | null;
        phone: string | null;
        company: string | null;
        convertedFromLeadId: string | null;
    }>;
    updateCustomer(id: string, data: Prisma.CustomerUpdateInput): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        email: string | null;
        phone: string | null;
        company: string | null;
        convertedFromLeadId: string | null;
    }>;
    deleteCustomer(id: string): Promise<{
        message: string;
    }>;
    getOpportunities(stage?: string): Promise<({
        customer: {
            name: string;
            company: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        customerId: string;
        stage: import(".prisma/client").$Enums.OpportunityStage;
        value: number;
        expectedCloseDate: Date | null;
    })[]>;
    getSupportTickets(status?: string): Promise<({
        customer: {
            name: string;
            company: string | null;
        };
    } & {
        id: string;
        description: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.TicketStatus;
        priority: import(".prisma/client").$Enums.TicketPriority;
        customerId: string;
        subject: string;
    })[]>;
    createSupportTicket(data: Prisma.SupportTicketUncheckedCreateInput): Promise<{
        id: string;
        description: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.TicketStatus;
        priority: import(".prisma/client").$Enums.TicketPriority;
        customerId: string;
        subject: string;
    }>;
    updateSupportTicketStatus(id: string, status: any): Promise<{
        id: string;
        description: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.TicketStatus;
        priority: import(".prisma/client").$Enums.TicketPriority;
        customerId: string;
        subject: string;
    }>;
    getFollowUps(): Promise<({
        customer: {
            name: string;
            company: string | null;
        } | null;
        lead: {
            name: string;
            company: string | null;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        date: Date;
        notes: string;
        nextActionDate: Date | null;
        customerId: string | null;
        leadId: string | null;
    })[]>;
    createFollowUp(data: Prisma.FollowUpUncheckedCreateInput): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        date: Date;
        notes: string;
        nextActionDate: Date | null;
        customerId: string | null;
        leadId: string | null;
    }>;
}
