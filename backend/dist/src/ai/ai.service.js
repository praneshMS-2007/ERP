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
var AiService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let AiService = AiService_1 = class AiService {
    prisma;
    logger = new common_1.Logger(AiService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async chatCompletion(messages) {
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
            }
            catch (error) {
                this.logger.warn(`Groq API call error, utilizing ERP database intelligence fallback: ${error}`);
            }
        }
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
};
exports.AiService = AiService;
exports.AiService = AiService = AiService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AiService);
//# sourceMappingURL=ai.service.js.map