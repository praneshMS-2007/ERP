import { Controller, Post, Get, Body } from '@nestjs/common';
import { AiService } from './ai.service';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  async chat(@Body() body: { messages: any[] }) {
    return this.aiService.chatCompletion(body.messages);
  }

  @Get('sales-insights')
  async getSalesInsights() {
    return this.aiService.getSalesInsights();
  }

  @Get('hr-insights')
  async getHrInsights() {
    return this.aiService.getHrInsights();
  }

  @Get('inventory-insights')
  async getInventoryInsights() {
    return this.aiService.getInventoryInsights();
  }

  @Get('executive-summary')
  async getExecutiveSummary() {
    return this.aiService.getExecutiveSummary();
  }
}
