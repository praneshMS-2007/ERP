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
var CrmService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrmService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let CrmService = CrmService_1 = class CrmService {
    prisma;
    logger = new common_1.Logger(CrmService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getLeads(status) {
        const where = status ? { status } : {};
        return this.prisma.lead.findMany({
            where,
            include: { followUps: { take: 5, orderBy: { date: 'desc' } } },
            orderBy: { createdAt: 'desc' },
        });
    }
    async createLead(data) {
        return this.prisma.lead.create({ data });
    }
    async updateLead(id, data) {
        return this.prisma.lead.update({ where: { id }, data });
    }
    async deleteLead(id) {
        await this.prisma.lead.delete({ where: { id } });
        return { message: 'Lead deleted.' };
    }
    async convertLeadToCustomer(id) {
        const lead = await this.prisma.lead.findUnique({ where: { id } });
        if (!lead)
            throw new common_1.NotFoundException('Lead not found.');
        const result = await this.prisma.$transaction(async (tx) => {
            const newCustomer = await tx.customer.create({
                data: {
                    name: lead.name,
                    email: lead.email,
                    phone: lead.phone,
                    company: lead.company,
                    convertedFromLeadId: lead.id,
                },
            });
            await tx.lead.update({
                where: { id: lead.id },
                data: { status: 'CONVERTED' },
            });
            await tx.opportunity.create({
                data: {
                    customerId: newCustomer.id,
                    value: 0,
                    stage: 'DISCOVERY',
                    expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                },
            });
            this.logger.log(`Lead "${lead.name}" converted to customer with auto-created opportunity.`);
            return newCustomer;
        });
        return { message: 'Lead converted to customer with opportunity created.', customer: result };
    }
    async getCustomers() {
        return this.prisma.customer.findMany({
            include: { opportunities: true, lead: { select: { name: true, status: true } } },
            orderBy: { createdAt: 'desc' },
        });
    }
    async createCustomer(data) {
        return this.prisma.customer.create({ data });
    }
    async updateCustomer(id, data) {
        return this.prisma.customer.update({ where: { id }, data });
    }
    async deleteCustomer(id) {
        await this.prisma.customer.delete({ where: { id } });
        return { message: 'Customer deleted.' };
    }
    async getOpportunities(stage) {
        const where = stage ? { stage } : {};
        return this.prisma.opportunity.findMany({
            where,
            include: { customer: { select: { name: true, company: true } } },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getSupportTickets(status) {
        const where = status ? { status } : {};
        return this.prisma.supportTicket.findMany({
            where,
            include: { customer: { select: { name: true, company: true } } },
            orderBy: { createdAt: 'desc' },
        });
    }
    async createSupportTicket(data) {
        return this.prisma.$transaction(async (tx) => {
            const ticket = await tx.supportTicket.create({ data });
            const nextActionDate = new Date();
            nextActionDate.setDate(nextActionDate.getDate() + 3);
            while (nextActionDate.getDay() === 0 || nextActionDate.getDay() === 6) {
                nextActionDate.setDate(nextActionDate.getDate() + 1);
            }
            await tx.followUp.create({
                data: {
                    customerId: data.customerId,
                    date: new Date(),
                    notes: `Follow up on support ticket: ${data.subject}`,
                    nextActionDate,
                },
            });
            this.logger.log(`Support ticket created with auto follow-up for ${nextActionDate.toDateString()}`);
            return ticket;
        });
    }
    async updateSupportTicketStatus(id, status) {
        return this.prisma.supportTicket.update({
            where: { id },
            data: { status },
        });
    }
    async getFollowUps() {
        return this.prisma.followUp.findMany({
            include: { customer: { select: { name: true, company: true } }, lead: { select: { name: true, company: true } } },
            orderBy: { date: 'asc' },
        });
    }
    async createFollowUp(data) {
        return this.prisma.followUp.create({ data });
    }
};
exports.CrmService = CrmService;
exports.CrmService = CrmService = CrmService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CrmService);
//# sourceMappingURL=crm.service.js.map