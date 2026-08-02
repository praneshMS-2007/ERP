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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryController = void 0;
const common_1 = require("@nestjs/common");
const inventory_service_1 = require("./inventory.service");
const client_1 = require("@prisma/client");
const decorators_1 = require("../auth/decorators");
let InventoryController = class InventoryController {
    inventoryService;
    constructor(inventoryService) {
        this.inventoryService = inventoryService;
    }
    getProducts(category, status) {
        return this.inventoryService.getProducts(category, status);
    }
    getProduct(id) {
        return this.inventoryService.getProduct(id);
    }
    createProduct(data) {
        return this.inventoryService.createProduct(data);
    }
    updateProduct(id, data) {
        return this.inventoryService.updateProduct(id, data);
    }
    deleteProduct(id) {
        return this.inventoryService.deleteProduct(id);
    }
    getSuppliers() {
        return this.inventoryService.getSuppliers();
    }
    createSupplier(data) {
        return this.inventoryService.createSupplier(data);
    }
    getPurchaseOrders() {
        return this.inventoryService.getPurchaseOrders();
    }
    createPurchaseOrder(data) {
        return this.inventoryService.createPurchaseOrder(data);
    }
    updatePurchaseOrderStatus(id, status) {
        return this.inventoryService.updatePurchaseOrderStatus(id, status);
    }
    getWarehouses() {
        return this.inventoryService.getWarehouses();
    }
    createWarehouse(data) {
        return this.inventoryService.createWarehouse(data);
    }
    getSalesOrders(status) {
        return this.inventoryService.getSalesOrders(status);
    }
    createSalesOrder(data) {
        return this.inventoryService.createSalesOrder(data);
    }
    updateSalesOrderStatus(id, status) {
        return this.inventoryService.updateSalesOrderStatus(id, status);
    }
};
exports.InventoryController = InventoryController;
__decorate([
    (0, common_1.Get)('products'),
    (0, decorators_1.RequirePermission)('INVENTORY', 'READ'),
    __param(0, (0, common_1.Query)('category')),
    __param(1, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "getProducts", null);
__decorate([
    (0, common_1.Get)('products/:id'),
    (0, decorators_1.RequirePermission)('INVENTORY', 'READ'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "getProduct", null);
__decorate([
    (0, common_1.Post)('products'),
    (0, decorators_1.RequirePermission)('INVENTORY', 'WRITE'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "createProduct", null);
__decorate([
    (0, common_1.Put)('products/:id'),
    (0, decorators_1.RequirePermission)('INVENTORY', 'WRITE'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "updateProduct", null);
__decorate([
    (0, common_1.Delete)('products/:id'),
    (0, decorators_1.RequirePermission)('INVENTORY', 'DELETE'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "deleteProduct", null);
__decorate([
    (0, common_1.Get)('suppliers'),
    (0, decorators_1.RequirePermission)('INVENTORY', 'READ'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "getSuppliers", null);
__decorate([
    (0, common_1.Post)('suppliers'),
    (0, decorators_1.RequirePermission)('INVENTORY', 'WRITE'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "createSupplier", null);
__decorate([
    (0, common_1.Get)('purchase-orders'),
    (0, decorators_1.RequirePermission)('INVENTORY', 'READ'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "getPurchaseOrders", null);
__decorate([
    (0, common_1.Post)('purchase-orders'),
    (0, decorators_1.RequirePermission)('INVENTORY', 'WRITE'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "createPurchaseOrder", null);
__decorate([
    (0, common_1.Put)('purchase-orders/:id/status'),
    (0, decorators_1.RequirePermission)('INVENTORY', 'WRITE'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "updatePurchaseOrderStatus", null);
__decorate([
    (0, common_1.Get)('warehouses'),
    (0, decorators_1.RequirePermission)('INVENTORY', 'READ'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "getWarehouses", null);
__decorate([
    (0, common_1.Post)('warehouses'),
    (0, decorators_1.RequirePermission)('INVENTORY', 'WRITE'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "createWarehouse", null);
__decorate([
    (0, common_1.Get)('sales-orders'),
    (0, decorators_1.RequirePermission)('INVENTORY', 'READ'),
    __param(0, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "getSalesOrders", null);
__decorate([
    (0, common_1.Post)('sales-orders'),
    (0, decorators_1.RequirePermission)('INVENTORY', 'WRITE'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "createSalesOrder", null);
__decorate([
    (0, common_1.Put)('sales-orders/:id/status'),
    (0, decorators_1.RequirePermission)('INVENTORY', 'WRITE'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "updateSalesOrderStatus", null);
exports.InventoryController = InventoryController = __decorate([
    (0, common_1.Controller)('inventory'),
    __metadata("design:paramtypes", [inventory_service_1.InventoryService])
], InventoryController);
//# sourceMappingURL=inventory.controller.js.map