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
exports.AnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let AnalyticsService = class AnalyticsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getDashboardMetrics() {
        const totalEmployees = await this.prisma.employee.count({ where: { status: { not: 'INACTIVE' } } });
        const totalProjects = await this.prisma.project.count({ where: { status: 'IN_PROGRESS' } });
        const totalCustomers = await this.prisma.customer.count();
        const incomeAgg = await this.prisma.income.aggregate({
            _sum: { amount: true },
        });
        const products = await this.prisma.product.findMany({ select: { stockLevel: true, price: true } });
        const inventoryValue = products.reduce((acc, p) => acc + ((p.stockLevel || 0) * (p.price || 0)), 0);
        return {
            employees: totalEmployees,
            activeProjects: totalProjects,
            totalCustomers,
            revenueYTD: incomeAgg._sum.amount || 0,
            inventoryValue,
        };
    }
    async getRevenueTrend() {
        const incomes = await this.prisma.income.findMany({
            select: { amount: true, date: true },
        });
        const trend = Array(12).fill(0);
        incomes.forEach(inc => {
            if (inc.date) {
                const month = new Date(inc.date).getMonth();
                if (month >= 0 && month < 12) {
                    trend[month] += (inc.amount || 0);
                }
            }
        });
        return {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            data: trend,
        };
    }
};
exports.AnalyticsService = AnalyticsService;
exports.AnalyticsService = AnalyticsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AnalyticsService);
//# sourceMappingURL=analytics.service.js.map