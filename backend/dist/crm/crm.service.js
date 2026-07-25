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
exports.CrmService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let CrmService = class CrmService {
    prisma;
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
        const customer = await this.prisma.$transaction(async (tx) => {
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
            return newCustomer;
        });
        return { message: 'Lead converted to customer.', customer };
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
};
exports.CrmService = CrmService;
exports.CrmService = CrmService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CrmService);
//# sourceMappingURL=crm.service.js.map