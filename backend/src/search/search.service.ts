import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  async globalSearch(query: string) {
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
}
