import { PrismaService } from '../prisma/prisma.service';
export declare class AiService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    chatCompletion(messages: any[]): Promise<any>;
}
