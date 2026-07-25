import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardMetrics() {
    const totalEmployees = await this.prisma.employee.count({ where: { status: 'ACTIVE' } });
    const totalProjects = await this.prisma.project.count({ where: { status: 'IN_PROGRESS' } });
    const totalCustomers = await this.prisma.customer.count();
    
    // Calculate total value of opportunities that are won
    const wonOpportunities = await this.prisma.opportunity.aggregate({
      where: { stage: 'CLOSED_WON' },
      _sum: { value: true },
    });
    
    // Inventory value
    const products = await this.prisma.product.findMany({ select: { stockLevel: true, price: true } });
    const inventoryValue = products.reduce((acc, p) => acc + (p.stockLevel * p.price), 0);

    return {
      employees: totalEmployees,
      activeProjects: totalProjects,
      totalCustomers,
      revenueYTD: wonOpportunities._sum.value || 0,
      inventoryValue,
    };
  }

  async getRevenueTrend() {
    const opps = await this.prisma.opportunity.findMany({
      where: { stage: 'CLOSED_WON' },
      select: { value: true, expectedCloseDate: true },
    });
    
    // Group by month
    const trend = Array(12).fill(0);
    opps.forEach(o => {
      if (o.expectedCloseDate) {
        const month = o.expectedCloseDate.getMonth();
        trend[month] += o.value;
      }
    });

    return {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      data: trend,
    };
  }
}
