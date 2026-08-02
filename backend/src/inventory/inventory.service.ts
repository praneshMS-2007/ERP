import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(private prisma: PrismaService) {}

  // ========== CATEGORIES ==========
  async getCategories() {
    return this.prisma.category.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async createCategory(data: { name: string; description?: string }) {
    return this.prisma.category.create({ data });
  }

  // ========== PRODUCTS ==========
  async getProducts(category?: string, status?: any) {
    const where: any = {};
    if (category) where.category = category;
    if (status) where.status = status;

    return this.prisma.product.findMany({
      where,
      include: { categoryRel: true },
      orderBy: { name: 'asc' },
    });
  }

  async getStockAlerts() {
    // Products where current stock level is less than or equal to min stock level
    const products = await this.prisma.product.findMany({
      orderBy: { stockLevel: 'asc' },
    });

    return products.map(p => {
      const isCritical = p.stockLevel <= Math.floor(p.minStockLevel / 2);
      return {
        id: p.id,
        sku: p.sku,
        name: p.name,
        category: p.category,
        stockLevel: p.stockLevel,
        minStockLevel: p.minStockLevel,
        unit: p.unit,
        severity: isCritical ? 'Critical' : 'Warning',
      };
    });
  }

  async getProduct(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { stockMovements: { take: 10, orderBy: { date: 'desc' } } },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async createProduct(data: Prisma.ProductUncheckedCreateInput) {
    return this.prisma.product.create({ data });
  }

  async updateProduct(id: string, data: Prisma.ProductUncheckedUpdateInput) {
    return this.prisma.product.update({ where: { id }, data });
  }

  async deleteProduct(id: string) {
    await this.prisma.product.delete({ where: { id } });
    return { message: 'Product deleted' };
  }

  // ========== SUPPLIERS ==========
  async getSuppliers() {
    return this.prisma.supplier.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async createSupplier(data: Prisma.SupplierUncheckedCreateInput) {
    return this.prisma.supplier.create({ data });
  }

  // ========== PURCHASE ORDERS ==========
  async getPurchaseOrders() {
    return this.prisma.purchaseOrder.findMany({
      include: { 
        supplier: { select: { name: true } },
        product: { select: { name: true, sku: true } },
      },
      orderBy: { orderDate: 'desc' },
    });
  }

  async createPurchaseOrder(data: Prisma.PurchaseOrderUncheckedCreateInput) {
    const product = await this.prisma.product.findUnique({ where: { id: data.productId } });
    const unitPrice = product ? product.price : 100;
    const totalAmount = data.totalAmount || (data.quantity * unitPrice);
    const count = await this.prisma.purchaseOrder.count();
    const orderNumber = data.orderNumber || `PO-2026-${String(count + 1).padStart(3, '0')}`;

    return this.prisma.purchaseOrder.create({
      data: {
        ...data,
        totalAmount,
        orderNumber,
      },
    });
  }

  async updatePurchaseOrderStatus(id: string, status: any) {
    const po = await this.prisma.purchaseOrder.findUnique({ where: { id } });
    if (!po) throw new NotFoundException('Purchase order not found');

    if (status === 'DELIVERED' && po.status !== 'DELIVERED') {
      return this.prisma.$transaction(async (tx) => {
        const updatedPO = await tx.purchaseOrder.update({
          where: { id },
          data: { status },
        });

        await tx.product.update({
          where: { id: po.productId },
          data: { stockLevel: { increment: po.quantity } },
        });

        await tx.stockMovement.create({
          data: {
            productId: po.productId,
            changeAmount: po.quantity,
            reason: 'RESTOCK',
            date: new Date(),
          },
        });

        this.logger.log(`PO ${id}: Restocked ${po.quantity} units for product ${po.productId}`);
        return updatedPO;
      });
    }

    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { status },
    });
  }

  // ========== WAREHOUSES ==========
  async getWarehouses() {
    return this.prisma.warehouse.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async createWarehouse(data: Prisma.WarehouseUncheckedCreateInput) {
    return this.prisma.warehouse.create({ data });
  }

  // ========== SALES ORDERS ==========
  async getSalesOrders(status?: any) {
    const where = status ? { status } : {};
    return this.prisma.salesOrder.findMany({
      where,
      include: { customer: { select: { name: true, company: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createSalesOrder(data: Prisma.SalesOrderUncheckedCreateInput) {
    const count = await this.prisma.salesOrder.count();
    const orderNo = data.orderNo || `SO-2026-${String(count + 1).padStart(3, '0')}`;
    return this.prisma.salesOrder.create({ data: { ...data, orderNo } });
  }

  async updateSalesOrderStatus(id: string, status: any) {
    const order = await this.prisma.salesOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Sales order not found');

    return this.prisma.salesOrder.update({
      where: { id },
      data: { status },
    });
  }
}
