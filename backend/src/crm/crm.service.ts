import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class CrmService {
  private readonly logger = new Logger(CrmService.name);

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
    if (!data.name?.trim()) throw new BadRequestException('A name is required.');
    if (!data.status) throw new BadRequestException('A status is required.');
    return this.prisma.lead.create({ data });
  }

  async updateLead(id: string, data: Prisma.LeadUpdateInput) {
    return this.prisma.lead.update({ where: { id }, data });
  }

  async deleteLead(id: string) {
    await this.prisma.lead.delete({ where: { id } });
    return { message: 'Lead deleted.' };
  }

  /**
   * BUSINESS LOGIC: Convert lead to customer AND auto-create an Opportunity.
   */
  async convertLeadToCustomer(id: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException('Lead not found.');
    if (lead.status === 'CONVERTED') throw new BadRequestException('This lead has already been converted.');
    if (lead.status === 'LOST') throw new BadRequestException('A lost lead cannot be converted. Update its status first.');

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Create customer from lead
      const newCustomer = await tx.customer.create({
        data: {
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          company: lead.company,
          convertedFromLeadId: lead.id,
        },
      });

      // 2. Update lead status
      await tx.lead.update({
        where: { id: lead.id },
        data: { status: 'CONVERTED' },
      });

      // 3. Auto-create an Opportunity for the new customer
      await tx.opportunity.create({
        data: {
          customerId: newCustomer.id,
          value: 0, // Initial value, to be updated by sales team
          stage: 'DISCOVERY',
          expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days out
        },
      });

      this.logger.log(`Lead "${lead.name}" converted to customer with auto-created opportunity.`);
      return newCustomer;
    });

    return { message: 'Lead converted to customer with opportunity created.', customer: result };
  }

  // ========== CUSTOMERS ==========
  async getCustomers() {
    return this.prisma.customer.findMany({
      include: { opportunities: true, lead: { select: { name: true, status: true } } },
      orderBy: { createdAt: 'desc' },
    });
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

  async createOpportunity(data: Prisma.OpportunityUncheckedCreateInput) {
    if (!data.customerId) throw new BadRequestException('A customer is required.');
    if (!data.stage) throw new BadRequestException('A stage is required.');
    if (data.value === undefined || data.value === null || Number.isNaN(Number(data.value)) || Number(data.value) < 0) {
      throw new BadRequestException('A non-negative deal value is required.');
    }
    return this.prisma.opportunity.create({ data });
  }

  async updateOpportunity(id: string, data: Prisma.OpportunityUpdateInput) {
    return this.prisma.opportunity.update({ where: { id }, data });
  }

  // ========== SUPPORT TICKETS ==========
  async getSupportTickets(status?: any) {
    const where = status ? { status } : {};
    return this.prisma.supportTicket.findMany({
      where,
      include: { customer: { select: { name: true, company: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * BUSINESS LOGIC: When a support ticket is created,
   * auto-create a FollowUp entry for the customer with a 3-day follow-up date.
   */
  async createSupportTicket(data: Prisma.SupportTicketUncheckedCreateInput) {
    if (!data.subject?.trim()) throw new BadRequestException('A subject is required.');
    if (!data.description?.trim()) throw new BadRequestException('A description is required.');
    return this.prisma.$transaction(async (tx) => {
      // 1. Create the ticket
      const ticket = await tx.supportTicket.create({ data });

      // 2. Auto-create a follow-up for 3 business days later
      const nextActionDate = new Date();
      nextActionDate.setDate(nextActionDate.getDate() + 3);
      // Skip weekends
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

  async updateSupportTicketStatus(id: string, status: any) {
    return this.prisma.supportTicket.update({
      where: { id },
      data: { status },
    });
  }

  async updateSupportTicket(id: string, data: Prisma.SupportTicketUpdateInput) {
    return this.prisma.supportTicket.update({ where: { id }, data });
  }

  async deleteSupportTicket(id: string) {
    await this.prisma.supportTicket.delete({ where: { id } });
    return { message: 'Support ticket deleted.' };
  }

  // ========== FOLLOW UPS ==========
  async getFollowUps() {
    return this.prisma.followUp.findMany({
      include: { customer: { select: { name: true, company: true } }, lead: { select: { name: true, company: true } } },
      orderBy: { date: 'asc' },
    });
  }

  async createFollowUp(data: Prisma.FollowUpUncheckedCreateInput) {
    if (!data.notes?.trim()) throw new BadRequestException('Notes are required.');
    if (!data.date || Number.isNaN(new Date(data.date as any).getTime())) {
      throw new BadRequestException('A valid date is required.');
    }
    if (!data.leadId && !data.customerId) {
      throw new BadRequestException('A follow-up must be linked to a lead or a customer.');
    }
    return this.prisma.followUp.create({ data });
  }

  async completeFollowUp(id: string) {
    const followUp = await this.prisma.followUp.findUnique({ where: { id } });
    if (!followUp) throw new NotFoundException('Follow-up not found.');
    return this.prisma.followUp.update({ where: { id }, data: { completedAt: new Date() } });
  }
}
