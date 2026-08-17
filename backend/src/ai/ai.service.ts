import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser, hasModuleAccess } from '../auth/permission.util';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * The RAG context is assembled per-caller, not once for everyone. Before
   * this, an EMPLOYEE account with no FINANCE/INVENTORY/CRM permission could
   * still ask the assistant for revenue or stock levels and get a real
   * answer, because the same prompt (built with every module's data) went
   * out regardless of who was asking. Filtering the model's *answer* isn't
   * a control — a differently-phrased question talks it out of a refusal.
   * The only real fix is upstream: a restricted number is never in the
   * prompt to begin with.
   */
  private async buildScopedContext(user?: AuthenticatedUser) {
    const lines: string[] = [];

    if (hasModuleAccess(user, 'HR', 'READ')) {
      const activeEmpCount = await this.prisma.employee.count({ where: { status: { not: 'INACTIVE' } } });
      lines.push(`- Active Employees: ${activeEmpCount}`);
    }

    if (hasModuleAccess(user, 'PROJECTS', 'READ')) {
      const [activeProjectsCount, delayedProjectsCount] = await Promise.all([
        this.prisma.project.count({ where: { status: 'IN_PROGRESS' } }),
        this.prisma.project.count({ where: { status: 'ON_HOLD' } }),
      ]);
      lines.push(`- Active Projects: ${activeProjectsCount} (Delayed/On Hold: ${delayedProjectsCount})`);
    }

    if (hasModuleAccess(user, 'CRM', 'READ')) {
      const openLeadsCount = await this.prisma.lead.count({ where: { status: { not: 'CONVERTED' } } });
      lines.push(`- Open CRM Leads: ${openLeadsCount}`);
    }

    if (hasModuleAccess(user, 'FINANCE', 'READ')) {
      const incomeAgg = await this.prisma.income.aggregate({ _sum: { amount: true } });
      lines.push(`- YTD Revenue: $${(incomeAgg._sum.amount || 0).toLocaleString()}`);
    }

    if (hasModuleAccess(user, 'INVENTORY', 'READ')) {
      const lowStockProducts = await this.prisma.product.findMany({
        where: { stockLevel: { lte: 20 } },
        select: { name: true, stockLevel: true },
        take: 5,
      });
      const summary = lowStockProducts.length > 0
        ? lowStockProducts.map((p) => `${p.name} (${p.stockLevel} units)`).join(', ')
        : 'None';
      lines.push(`- Low Stock Items: ${summary}`);
    }

    return lines;
  }

  async chatCompletion(messages: any[], user?: AuthenticatedUser) {
    const groqApiKey = process.env.GROQ_API_KEY;
    const contextLines = await this.buildScopedContext(user);

    const ragSystemPrompt = contextLines.length > 0
      ? `You are the Enterprise ERP AI Operations Copilot.
You have REAL-TIME direct access to live PostgreSQL enterprise metrics — but ONLY the ones listed below.
This list is already filtered to what this specific user's role is permitted to see:
${contextLines.join('\n')}

Answer using only these exact live numbers. If asked about a metric not listed above (for example
revenue, salary, or stock levels when those aren't in your list), say plainly that it isn't available
to their role and suggest they ask someone with access — never guess, estimate, or infer a number for
data you were not given.`
      : `You are the Enterprise ERP AI Operations Copilot. This user's role does not currently grant
access to any live enterprise metrics. Do not state or estimate any company figures — explain that
data access depends on their role's permissions and suggest they contact an administrator if they
believe this is wrong.`;

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
              { role: 'system', content: ragSystemPrompt },
              ...(messages || []),
            ],
          }),
        });

        if (response.ok) {
          const data = await response.json();
          return data;
        }
      } catch (error) {
        this.logger.warn(`Groq API call error, utilizing ERP database RAG engine fallback: ${error}`);
      }
    }

    // Fallback used when Groq is unavailable — still governed by the same
    // per-caller scoping, not a second unfiltered path back to the data.
    const lastUserMessage = messages && messages.length > 0 ? messages[messages.length - 1]?.content : '';
    const topicModule =
      /employee|joined|staff/i.test(lastUserMessage) ? 'HR' :
      /stock|inventory|product/i.test(lastUserMessage) ? 'INVENTORY' :
      /project|delayed/i.test(lastUserMessage) ? 'PROJECTS' :
      /sales|revenue|deal|lead/i.test(lastUserMessage) ? 'CRM' :
      /revenue|finance|income/i.test(lastUserMessage) ? 'FINANCE' :
      null;

    let responseText: string;
    if (topicModule && !hasModuleAccess(user, topicModule, 'READ')) {
      responseText = `That's not something your role has access to. Ask someone with ${topicModule.toLowerCase()} permissions, or check with an administrator if you think this is wrong.`;
    } else if (contextLines.length > 0) {
      responseText = `Here's what I can see for your role:\n${contextLines.join('\n')}`;
    } else {
      responseText = `Your role doesn't currently have access to any live enterprise metrics I can report on.`;
    }

    return {
      choices: [
        {
          message: {
            role: 'assistant',
            content: responseText,
          },
        },
      ],
    };
  }

}
