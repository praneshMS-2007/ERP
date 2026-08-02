import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(private prisma: PrismaService) {}

  async chatCompletion(messages: any[]) {
    const groqApiKey = process.env.GROQ_API_KEY;

    if (groqApiKey) {
      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              {
                role: 'system',
                content: 'You are the Enterprise ERP AI Copilot. Provide accurate, professional assistance on workforce, finance, CRM, inventory, and projects.'
              },
              ...(messages || [])
            ],
          }),
        });

        if (response.ok) {
          const data = await response.json();
          return data;
        }
      } catch (error) {
        this.logger.warn(`Groq API call error, utilizing ERP database intelligence fallback: ${error}`);
      }
    }

    // Dynamic Fallback using live DB metrics
    const empCount = await this.prisma.employee.count({ where: { status: { not: 'INACTIVE' } } });
    const activeProjects = await this.prisma.project.count({ where: { status: 'IN_PROGRESS' } });
    const openLeads = await this.prisma.lead.count();
    
    return {
      choices: [
        {
          message: {
            role: 'assistant',
            content: `I am your Enterprise ERP AI Operations Copilot. Live database metrics: ${empCount} active employees, ${activeProjects} active projects, and ${openLeads} active CRM leads. How can I assist you with operational workflows today?`
          }
        }
      ]
    };
  }
}
