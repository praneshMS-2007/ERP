import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class CrmService {
  constructor(private prisma: PrismaService) {}

  // ========== LEADS ==========
  async getLeads(status?: any) {
    const where = status ? { status } : {};
    return this.prisma.lead.findMany({
      where,
      include: { followUps: { take: 5, orderBy: { date: 'desc' } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createLead(data: Prisma.LeadCreateInput) {
    return this.prisma.lead.create({ data });
  }

  async updateLead(id: string, data: Prisma.LeadUpdateInput) {
    return this.prisma.lead.update({ where: { id }, data });
  }

  async deleteLead(id: string) {
    await this.prisma.lead.delete({ where: { id } });
    return { message: 'Lead deleted.' };
  }

  async convertLeadToCustomer(id: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException('Lead not found.');

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

  // ========== CUSTOMERS ==========
  async getCustomers() {
    return this.prisma.customer.findMany({
      include: { opportunities: true, lead: { select: { name: true, status: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createCustomer(data: Prisma.CustomerCreateInput) {
    return this.prisma.customer.create({ data });
  }

  async updateCustomer(id: string, data: Prisma.CustomerUpdateInput) {
    return this.prisma.customer.update({ where: { id }, data });
  }

  async deleteCustomer(id: string) {
    await this.prisma.customer.delete({ where: { id } });
    return { message: 'Customer deleted.' };
  }

  // ========== OPPORTUNITIES ==========
  async getOpportunities(stage?: any) {
    const where = stage ? { stage } : {};
    return this.prisma.opportunity.findMany({
      where,
      include: { customer: { select: { name: true, company: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}
