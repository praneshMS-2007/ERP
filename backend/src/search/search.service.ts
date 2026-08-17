import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser, hasModuleAccess } from '../auth/permission.util';

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  /**
   * Each category is fetched only if the caller has READ on the module it
   * belongs to — not fetched-then-filtered, actually skipped, so a
   * restricted category costs no query and can never accidentally leak
   * through a bug in a later filtering step.
   */
  async globalSearch(query: string, user?: AuthenticatedUser) {
    const empty = { employees: [], products: [], customers: [], invoices: [], projects: [] };
    if (!query || query.trim().length === 0) return empty;

    const q = query.trim();

    const [employees, products, customers, invoices, projects] = await Promise.all([
      hasModuleAccess(user, 'HR', 'READ')
        ? this.prisma.employee.findMany({
            where: {
              OR: [
                { firstName: { contains: q, mode: 'insensitive' } },
                { lastName: { contains: q, mode: 'insensitive' } },
                { empCode: { contains: q, mode: 'insensitive' } },
              ],
            },
            select: { id: true, firstName: true, lastName: true, empCode: true },
            take: 5,
          })
        : Promise.resolve([]),

      hasModuleAccess(user, 'INVENTORY', 'READ')
        ? this.prisma.product.findMany({
            where: {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { sku: { contains: q, mode: 'insensitive' } },
              ],
            },
            select: { id: true, name: true, sku: true, stockLevel: true, price: true },
            take: 5,
          })
        : Promise.resolve([]),

      hasModuleAccess(user, 'CRM', 'READ')
        ? this.prisma.customer.findMany({
            where: {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { company: { contains: q, mode: 'insensitive' } },
              ],
            },
            select: { id: true, name: true, company: true, email: true },
            take: 5,
          })
        : Promise.resolve([]),

      hasModuleAccess(user, 'FINANCE', 'READ')
        ? this.prisma.invoice.findMany({
            where: {
              OR: [
                { invoiceNo: { contains: q, mode: 'insensitive' } },
                { clientName: { contains: q, mode: 'insensitive' } },
              ],
            },
            select: { id: true, invoiceNo: true, clientName: true, amount: true, status: true },
            take: 5,
          })
        : Promise.resolve([]),

      hasModuleAccess(user, 'PROJECTS', 'READ')
        ? this.prisma.project.findMany({
            where: { name: { contains: q, mode: 'insensitive' } },
            select: { id: true, name: true, status: true, progress: true },
            take: 5,
          })
        : Promise.resolve([]),
    ]);

    return { employees, products, customers, invoices, projects };
  }
}
