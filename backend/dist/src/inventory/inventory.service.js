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
var InventoryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let InventoryService = InventoryService_1 = class InventoryService {
    prisma;
    logger = new common_1.Logger(InventoryService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getProducts(category, status) {
        const where = {};
        if (category)
            where.category = category;
        if (status)
            where.status = status;
        return this.prisma.product.findMany({
            where,
            orderBy: { name: 'asc' },
        });
    }
    async getProduct(id) {
        const product = await this.prisma.product.findUnique({
            where: { id },
            include: { stockMovements: { take: 10, orderBy: { date: 'desc' } } }
        });
        if (!product)
            throw new common_1.NotFoundException('Product not found');
        return product;
    }
    async createProduct(data) {
        return this.prisma.product.create({ data });
    }
    async updateProduct(id, data) {
        return this.prisma.product.update({ where: { id }, data });
    }
    async deleteProduct(id) {
        await this.prisma.product.delete({ where: { id } });
        return { message: 'Product deleted' };
    }
    async getSuppliers() {
        return this.prisma.supplier.findMany({
            orderBy: { name: 'asc' }
        });
    }
    async createSupplier(data) {
        return this.prisma.supplier.create({ data });
    }
    async getPurchaseOrders() {
        return this.prisma.purchaseOrder.findMany({
            include: {
                supplier: { select: { name: true } },
                product: { select: { name: true, sku: true } }
            },
            orderBy: { orderDate: 'desc' }
        });
    }
    async createPurchaseOrder(data) {
        return this.prisma.purchaseOrder.create({ data });
    }
    async updatePurchaseOrderStatus(id, status) {
        const po = await this.prisma.purchaseOrder.findUnique({ where: { id } });
        if (!po)
            throw new common_1.NotFoundException('Purchase order not found');
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
    async getWarehouses() {
        return this.prisma.warehouse.findMany({
            orderBy: { name: 'asc' },
        });
    }
    async createWarehouse(data) {
        return this.prisma.warehouse.create({ data });
    }
    async getSalesOrders(status) {
        const where = status ? { status } : {};
        return this.prisma.salesOrder.findMany({
            where,
            include: { customer: { select: { name: true, company: true } } },
            orderBy: { createdAt: 'desc' },
        });
    }
    async createSalesOrder(data) {
        return this.prisma.salesOrder.create({ data });
    }
    async updateSalesOrderStatus(id, status) {
        const order = await this.prisma.salesOrder.findUnique({ where: { id } });
        if (!order)
            throw new common_1.NotFoundException('Sales order not found');
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
};
exports.InventoryService = InventoryService;
exports.InventoryService = InventoryService = InventoryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], InventoryService);
//# sourceMappingURL=inventory.service.js.map