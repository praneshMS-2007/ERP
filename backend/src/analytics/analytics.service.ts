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

  /**
   * Retention over the trailing 12 months, computed from real join/departure
   * dates — not a placeholder. Formula: (headcount 12 months ago − people
   * who left since) / headcount 12 months ago.
   *
   * Returns insufficientData:true whenever there's no honest denominator —
   * e.g. a fresh dataset where nobody had joined 12 months ago yet. The
   * frontend must show "Insufficient data" in that case, not a number.
   * Before lastWorkingDay existed (see Employee schema), there was no way
   * to compute this at all; every leaver used to vanish with no recorded date.
   */
  async getRetention() {
    const periodStart = new Date();
    periodStart.setFullYear(periodStart.getFullYear() - 1);
    const now = new Date();

    const headcountAtPeriodStart = await this.prisma.employee.count({
      where: {
        joinDate: { lte: periodStart },
        OR: [{ lastWorkingDay: null }, { lastWorkingDay: { gt: periodStart } }],
      },
    });

    if (headcountAtPeriodStart === 0) {
      return { insufficientData: true, retentionPercent: null, periodMonths: 12, headcountAtPeriodStart: 0, leaversInPeriod: 0 };
    }

    // Must also have been part of the original cohort (joined on or before
    // periodStart) — someone who joined last month and left last week was
    // never one of the people "retained or not" from 12 months ago, and
    // counting them here would understate retention for a reason that has
    // nothing to do with keeping long-tenured staff.
    const leaversInPeriod = await this.prisma.employee.count({
      where: {
        lastWorkingDay: { gte: periodStart, lte: now },
        joinDate: { lte: periodStart },
      },
    });

    const retentionPercent = Math.round(((headcountAtPeriodStart - leaversInPeriod) / headcountAtPeriodStart) * 1000) / 10;

    return { insufficientData: false, retentionPercent, periodMonths: 12, headcountAtPeriodStart, leaversInPeriod };
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

