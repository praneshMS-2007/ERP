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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let SearchService = class SearchService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async globalSearch(query) {
        if (!query || query.trim().length === 0) {
            return { employees: [], products: [], customers: [], invoices: [], projects: [] };
        }
        const q = query.trim();
        const [employees, products, customers, invoices, projects] = await Promise.all([
            this.prisma.employee.findMany({
                where: {
                    OR: [
                        { firstName: { contains: q, mode: 'insensitive' } },
                        { lastName: { contains: q, mode: 'insensitive' } },
                        { empCode: { contains: q, mode: 'insensitive' } },
                    ],
                },
                select: { id: true, firstName: true, lastName: true, empCode: true },
                take: 5,
            }),
            this.prisma.product.findMany({
                where: {
                    OR: [
                        { name: { contains: q, mode: 'insensitive' } },
                        { sku: { contains: q, mode: 'insensitive' } },
                    ],
                },
                select: { id: true, name: true, sku: true, stockLevel: true, price: true },
                take: 5,
            }),
            this.prisma.customer.findMany({
                where: {
                    OR: [
                        { name: { contains: q, mode: 'insensitive' } },
                        { company: { contains: q, mode: 'insensitive' } },
                    ],
                },
                select: { id: true, name: true, company: true, email: true },
                take: 5,
            }),
            this.prisma.invoice.findMany({
                where: {
                    OR: [
                        { invoiceNo: { contains: q, mode: 'insensitive' } },
                        { clientName: { contains: q, mode: 'insensitive' } },
                    ],
                },
                select: { id: true, invoiceNo: true, clientName: true, amount: true, status: true },
                take: 5,
            }),
            this.prisma.project.findMany({
                where: {
                    name: { contains: q, mode: 'insensitive' },
                },
                select: { id: true, name: true, status: true, progress: true },
                take: 5,
            }),
        ]);
        return {
            employees,
            products,
            customers,
            invoices,
            projects,
        };
    }
};
exports.SearchService = SearchService;
exports.SearchService = SearchService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SearchService);
//# sourceMappingURL=search.service.js.map