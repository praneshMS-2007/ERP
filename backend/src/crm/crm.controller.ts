import { Controller, Get, Post, Body, Param, Put, Delete, Query } from '@nestjs/common';
import { CrmService } from './crm.service';
import { Prisma } from '@prisma/client';

@Controller('crm')
export class CrmController {
  constructor(private readonly crmService: CrmService) {}

  @Get('leads')
  getLeads(@Query('status') status?: string) {
    return this.crmService.getLeads(status);
  }

  @Post('leads')
  createLead(@Body() data: Prisma.LeadCreateInput) {
    return this.crmService.createLead(data);
  }

  @Put('leads/:id')
  updateLead(@Param('id') id: string, @Body() data: Prisma.LeadUpdateInput) {
    return this.crmService.updateLead(id, data);
  }

  @Delete('leads/:id')
  deleteLead(@Param('id') id: string) {
    return this.crmService.deleteLead(id);
  }

  @Post('leads/:id/convert')
  convertLeadToCustomer(@Param('id') id: string) {
    return this.crmService.convertLeadToCustomer(id);
  }

  @Get('customers')
  getCustomers() {
    return this.crmService.getCustomers();
  }

  @Post('customers')
  createCustomer(@Body() data: Prisma.CustomerCreateInput) {
    return this.crmService.createCustomer(data);
  }

  @Put('customers/:id')
  updateCustomer(@Param('id') id: string, @Body() data: Prisma.CustomerUpdateInput) {
    return this.crmService.updateCustomer(id, data);
  }

  @Delete('customers/:id')
  deleteCustomer(@Param('id') id: string) {
    return this.crmService.deleteCustomer(id);
  }

  @Get('opportunities')
  getOpportunities(@Query('stage') stage?: string) {
    return this.crmService.getOpportunities(stage);
  }
}
