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
exports.InventoryService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let InventoryService = class InventoryService {
    prisma;
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
};
exports.InventoryService = InventoryService;
exports.InventoryService = InventoryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], InventoryService);
//# sourceMappingURL=inventory.service.js.map