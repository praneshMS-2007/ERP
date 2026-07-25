import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
export declare class CrmService {
    private prisma;
    constructor(prisma: PrismaService);
    getLeads(status?: any): Promise<({
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
        email: string | null;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.LeadStatus;
        name: string;
        phone: string | null;
        company: string | null;
    })[]>;
    createLead(data: Prisma.LeadCreateInput): Promise<{
        id: string;
        email: string | null;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.LeadStatus;
        name: string;
        phone: string | null;
        company: string | null;
    }>;
    updateLead(id: string, data: Prisma.LeadUpdateInput): Promise<{
        id: string;
        email: string | null;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.LeadStatus;
        name: string;
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
            email: string | null;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            phone: string | null;
            company: string | null;
            convertedFromLeadId: string | null;
        };
    }>;
    getCustomers(): Promise<({
        lead: {
            status: import(".prisma/client").$Enums.LeadStatus;
            name: string;
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
        email: string | null;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        phone: string | null;
        company: string | null;
        convertedFromLeadId: string | null;
    })[]>;
    createCustomer(data: Prisma.CustomerCreateInput): Promise<{
        id: string;
        email: string | null;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        phone: string | null;
        company: string | null;
        convertedFromLeadId: string | null;
    }>;
    updateCustomer(id: string, data: Prisma.CustomerUpdateInput): Promise<{
        id: string;
        email: string | null;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        phone: string | null;
        company: string | null;
        convertedFromLeadId: string | null;
    }>;
    deleteCustomer(id: string): Promise<{
        message: string;
    }>;
    getOpportunities(stage?: any): Promise<({
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
}
