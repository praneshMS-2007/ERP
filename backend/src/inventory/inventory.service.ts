import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

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

  /**
   * BUSINESS LOGIC: When a Purchase Order is marked DELIVERED,
   * auto-increase product stock and create a StockMovement record.
   */
  async updatePurchaseOrderStatus(id: string, status: any) {
    const po = await this.prisma.purchaseOrder.findUnique({ where: { id } });
    if (!po) throw new NotFoundException('Purchase order not found');

    if (status === 'DELIVERED' && po.status !== 'DELIVERED') {
      // Use a transaction to ensure atomicity
      return this.prisma.$transaction(async (tx) => {
        // 1. Update PO status
        const updatedPO = await tx.purchaseOrder.update({
          where: { id },
          data: { status },
        });

        // 2. Increase product stock level
        await tx.product.update({
          where: { id: po.productId },
          data: { stockLevel: { increment: po.quantity } },
        });

        // 3. Create StockMovement record
        await tx.stockMovement.create({
          data: {
            productId: po.productId,
            changeAmount: po.quantity, // Positive = restock
            reason: 'RESTOCK',
            date: new Date(),
          },
        });

        this.logger.log(`PO ${id}: Restocked ${po.quantity} units for product ${po.productId}`);
        return updatedPO;
      });
    }

    // For non-DELIVERED status changes, just update normally
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
    return this.prisma.salesOrder.create({ data });
  }

  /**
   * BUSINESS LOGIC: When a Sales Order status is changed to DELIVERED,
   * auto-deduct stock from the related products and create StockMovement records.
   * Note: Since SalesOrder doesn't have line items with product references in schema,
   * we log the event. For full implementation, a SalesOrderItem model would be needed.
   */
  async updateSalesOrderStatus(id: string, status: any) {
    const order = await this.prisma.salesOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Sales order not found');

    const updatedOrder = await this.prisma.salesOrder.update({
      where: { id },
      data: { status },
    });

    if (status === 'DELIVERED' && order.status !== 'DELIVERED') {
      this.logger.log(`Sales Order ${order.orderNo} delivered. Total: ${order.totalAmount}`);
    }

    if (status === 'CANCELLED' && order.status !== 'CANCELLED') {
      this.logger.log(`Sales Order ${order.orderNo} cancelled.`);
    }

    return updatedOrder;
  }
}
