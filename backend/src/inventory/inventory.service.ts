import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  // ========== PRODUCTS ==========
  async getProducts(category?: string, status?: any) {
    const where: any = {};
    if (category) where.category = category;
    if (status) where.status = status;

    return this.prisma.product.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async getProduct(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { stockMovements: { take: 10, orderBy: { date: 'desc' } } }
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async createProduct(data: Prisma.ProductCreateInput) {
    return this.prisma.product.create({ data });
  }

  async updateProduct(id: string, data: Prisma.ProductUpdateInput) {
    return this.prisma.product.update({ where: { id }, data });
  }

  async deleteProduct(id: string) {
    await this.prisma.product.delete({ where: { id } });
    return { message: 'Product deleted' };
  }

  // ========== SUPPLIERS ==========
  async getSuppliers() {
    return this.prisma.supplier.findMany({
      orderBy: { name: 'asc' }
    });
  }

  async createSupplier(data: Prisma.SupplierCreateInput) {
    return this.prisma.supplier.create({ data });
  }

  // ========== PURCHASE ORDERS ==========
  async getPurchaseOrders() {
    return this.prisma.purchaseOrder.findMany({
      include: { 
        supplier: { select: { name: true } },
        product: { select: { name: true, sku: true } }
      },
      orderBy: { orderDate: 'desc' }
    });
  }

  async createPurchaseOrder(data: Prisma.PurchaseOrderUncheckedCreateInput) {
    return this.prisma.purchaseOrder.create({ data });
  }
}
