import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardMetrics() {
    const totalEmployees = await this.prisma.employee.count({ where: { status: { not: 'INACTIVE' } } });
    const totalProjects = await this.prisma.project.count({ where: { status: 'IN_PROGRESS' } });
    const totalCustomers = await this.prisma.customer.count();
    
    // Calculate total value of live Income records
    const incomeAgg = await this.prisma.income.aggregate({
      _sum: { amount: true },
    });
    
    // Inventory value
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
    
    // Group by month
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
}

