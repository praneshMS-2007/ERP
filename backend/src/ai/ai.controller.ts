import { Controller, Post, Get, Body } from '@nestjs/common';
import { AiService } from './ai.service';
import { RequirePermission, CurrentUser } from '../auth/decorators';
import type { AuthenticatedUser } from '../auth/permission.util';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  // No @RequirePermission here on purpose — every role is allowed to talk to
  // the assistant (it's in the sidebar for everyone). What each caller gets
  // back is scoped inside chatCompletion itself, per their own permissions,
  // not gated at the door.
  @Post('chat')
  async chat(@Body() body: { messages: any[] }, @CurrentUser() user: AuthenticatedUser) {
    return this.aiService.chatCompletion(body.messages, user);
  }

  @Get('sales-insights')
  @RequirePermission('CRM', 'READ')
  async getSalesInsights() {
    return this.aiService.getSalesInsights();
  }

  @Get('hr-insights')
  @RequirePermission('HR', 'READ')
  async getHrInsights(@CurrentUser() user: AuthenticatedUser) {
    return this.aiService.getHrInsights(user);
  }

  @Get('inventory-insights')
  @RequirePermission('INVENTORY', 'READ')
  async getInventoryInsights() {
    return this.aiService.getInventoryInsights();
  }

  // Cross-module executive rollup — gated like the Analytics dashboard
  // itself, not any single module's permission.
  @Get('executive-summary')
  @RequirePermission('ANALYTICS', 'READ')
  async getExecutiveSummary() {
    return this.aiService.getExecutiveSummary();
  }
}
