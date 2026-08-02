import { Controller, Get, Post, Body, Param, Put, Delete, Query } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { Prisma } from '@prisma/client';
import { RequirePermission } from '../auth/decorators';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('products')
  @RequirePermission('INVENTORY', 'READ')
  getProducts(@Query('category') category?: string, @Query('status') status?: string) {
    return this.inventoryService.getProducts(category, status);
  }

  @Get('products/:id')
  @RequirePermission('INVENTORY', 'READ')
  getProduct(@Param('id') id: string) {
    return this.inventoryService.getProduct(id);
  }

  @Post('products')
  @RequirePermission('INVENTORY', 'WRITE')
  createProduct(@Body() data: Prisma.ProductCreateInput) {
    return this.inventoryService.createProduct(data);
  }

  @Put('products/:id')
  @RequirePermission('INVENTORY', 'WRITE')
  updateProduct(@Param('id') id: string, @Body() data: Prisma.ProductUpdateInput) {
    return this.inventoryService.updateProduct(id, data);
  }

  @Delete('products/:id')
  @RequirePermission('INVENTORY', 'DELETE')
  deleteProduct(@Param('id') id: string) {
    return this.inventoryService.deleteProduct(id);
  }

  @Get('suppliers')
  @RequirePermission('INVENTORY', 'READ')
  getSuppliers() {
    return this.inventoryService.getSuppliers();
  }

  @Post('suppliers')
  @RequirePermission('INVENTORY', 'WRITE')
  createSupplier(@Body() data: Prisma.SupplierCreateInput) {
    return this.inventoryService.createSupplier(data);
  }

  @Get('purchase-orders')
  @RequirePermission('INVENTORY', 'READ')
  getPurchaseOrders() {
    return this.inventoryService.getPurchaseOrders();
  }

  @Post('purchase-orders')
  @RequirePermission('INVENTORY', 'WRITE')
  createPurchaseOrder(@Body() data: Prisma.PurchaseOrderUncheckedCreateInput) {
    return this.inventoryService.createPurchaseOrder(data);
  }

  @Put('purchase-orders/:id/status')
  @RequirePermission('INVENTORY', 'WRITE')
  updatePurchaseOrderStatus(@Param('id') id: string, @Body('status') status: any) {
    return this.inventoryService.updatePurchaseOrderStatus(id, status);
  }

  // ========== WAREHOUSES ==========
  @Get('warehouses')
  @RequirePermission('INVENTORY', 'READ')
  getWarehouses() {
    return this.inventoryService.getWarehouses();
  }

  @Post('warehouses')
  @RequirePermission('INVENTORY', 'WRITE')
  createWarehouse(@Body() data: Prisma.WarehouseUncheckedCreateInput) {
    return this.inventoryService.createWarehouse(data);
  }

  // ========== SALES ORDERS ==========
  @Get('sales-orders')
  @RequirePermission('INVENTORY', 'READ')
  getSalesOrders(@Query('status') status?: string) {
    return this.inventoryService.getSalesOrders(status);
  }

  @Post('sales-orders')
  @RequirePermission('INVENTORY', 'WRITE')
  createSalesOrder(@Body() data: Prisma.SalesOrderUncheckedCreateInput) {
    return this.inventoryService.createSalesOrder(data);
  }

  @Put('sales-orders/:id/status')
  @RequirePermission('INVENTORY', 'WRITE')
  updateSalesOrderStatus(@Param('id') id: string, @Body('status') status: any) {
    return this.inventoryService.updateSalesOrderStatus(id, status);
  }
}
