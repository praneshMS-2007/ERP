import { Controller, Get, Post, Body, Param, Put, Delete, Query } from '@nestjs/common';
import { CrmService } from './crm.service';
import { Prisma } from '@prisma/client';
import { RequirePermission } from '../auth/decorators';

@Controller('crm')
export class CrmController {
  constructor(private readonly crmService: CrmService) {}

  @Get('leads')
  @RequirePermission('CRM', 'READ')
  getLeads(@Query('status') status?: string) {
    return this.crmService.getLeads(status);
  }

  @Post('leads')
  @RequirePermission('CRM', 'WRITE')
  createLead(@Body() data: Prisma.LeadCreateInput) {
    return this.crmService.createLead(data);
  }

  @Put('leads/:id')
  @RequirePermission('CRM', 'WRITE')
  updateLead(@Param('id') id: string, @Body() data: Prisma.LeadUpdateInput) {
    return this.crmService.updateLead(id, data);
  }

  @Delete('leads/:id')
  @RequirePermission('CRM', 'DELETE')
  deleteLead(@Param('id') id: string) {
    return this.crmService.deleteLead(id);
  }

  @Post('leads/:id/convert')
  @RequirePermission('CRM', 'WRITE')
  convertLeadToCustomer(@Param('id') id: string) {
    return this.crmService.convertLeadToCustomer(id);
  }

  @Get('customers')
  @RequirePermission('CRM', 'READ')
  getCustomers() {
    return this.crmService.getCustomers();
  }

  // No POST here, deliberately — a Customer only ever comes into existence
  // by converting a Lead (see leads/:id/convert below). That's the one
  // funnel: Lead -> Customer -> Opportunity. Editing an existing customer
  // is still allowed, just never creating one out of nowhere.
  @Put('customers/:id')
  @RequirePermission('CRM', 'WRITE')
  updateCustomer(@Param('id') id: string, @Body() data: Prisma.CustomerUpdateInput) {
    return this.crmService.updateCustomer(id, data);
  }

  @Delete('customers/:id')
  @RequirePermission('CRM', 'DELETE')
  deleteCustomer(@Param('id') id: string) {
    return this.crmService.deleteCustomer(id);
  }

  @Get('opportunities')
  @RequirePermission('CRM', 'READ')
  getOpportunities(@Query('stage') stage?: string) {
    return this.crmService.getOpportunities(stage);
  }

  @Post('opportunities')
  @RequirePermission('CRM', 'WRITE')
  createOpportunity(@Body() data: Prisma.OpportunityUncheckedCreateInput) {
    return this.crmService.createOpportunity(data);
  }

  @Put('opportunities/:id')
  @RequirePermission('CRM', 'WRITE')
  updateOpportunity(@Param('id') id: string, @Body() data: Prisma.OpportunityUpdateInput) {
    return this.crmService.updateOpportunity(id, data);
  }

  // ========== SUPPORT TICKETS ==========
  @Get('tickets')
  @RequirePermission('CRM', 'READ')
  getSupportTickets(@Query('status') status?: string) {
    return this.crmService.getSupportTickets(status);
  }

  @Post('tickets')
  @RequirePermission('CRM', 'WRITE')
  createSupportTicket(@Body() data: Prisma.SupportTicketUncheckedCreateInput) {
    return this.crmService.createSupportTicket(data);
  }

  @Put('tickets/:id/status')
  @RequirePermission('CRM', 'WRITE')
  updateSupportTicketStatus(@Param('id') id: string, @Body('status') status: any) {
    return this.crmService.updateSupportTicketStatus(id, status);
  }

  @Put('tickets/:id')
  @RequirePermission('CRM', 'WRITE')
  updateSupportTicket(@Param('id') id: string, @Body() data: Prisma.SupportTicketUpdateInput) {
    return this.crmService.updateSupportTicket(id, data);
  }

  @Delete('tickets/:id')
  @RequirePermission('CRM', 'DELETE')
  deleteSupportTicket(@Param('id') id: string) {
    return this.crmService.deleteSupportTicket(id);
  }

  // ========== FOLLOW UPS ==========
  @Get('follow-ups')
  @RequirePermission('CRM', 'READ')
  getFollowUps() {
    return this.crmService.getFollowUps();
  }

  @Post('follow-ups')
  @RequirePermission('CRM', 'WRITE')
  createFollowUp(@Body() data: Prisma.FollowUpUncheckedCreateInput) {
    return this.crmService.createFollowUp(data);
  }

  @Put('follow-ups/:id/complete')
  @RequirePermission('CRM', 'WRITE')
  completeFollowUp(@Param('id') id: string) {
    return this.crmService.completeFollowUp(id);
  }
}
