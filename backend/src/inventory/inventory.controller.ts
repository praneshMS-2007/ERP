import { Controller, Get, Post, Body, Param, Put, Delete, Query } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { Prisma } from '@prisma/client';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('products')
  getProducts(@Query('category') category?: string, @Query('status') status?: string) {
    return this.inventoryService.getProducts(category, status);
  }

  @Get('products/:id')
  getProduct(@Param('id') id: string) {
    return this.inventoryService.getProduct(id);
  }

  @Post('products')
  createProduct(@Body() data: Prisma.ProductCreateInput) {
    return this.inventoryService.createProduct(data);
  }

  @Put('products/:id')
  updateProduct(@Param('id') id: string, @Body() data: Prisma.ProductUpdateInput) {
    return this.inventoryService.updateProduct(id, data);
  }

  @Delete('products/:id')
  deleteProduct(@Param('id') id: string) {
    return this.inventoryService.deleteProduct(id);
  }

  @Get('suppliers')
  getSuppliers() {
    return this.inventoryService.getSuppliers();
  }

  @Post('suppliers')
  createSupplier(@Body() data: Prisma.SupplierCreateInput) {
    return this.inventoryService.createSupplier(data);
  }

  @Get('purchase-orders')
  getPurchaseOrders() {
    return this.inventoryService.getPurchaseOrders();
  }

  @Post('purchase-orders')
  createPurchaseOrder(@Body() data: Prisma.PurchaseOrderUncheckedCreateInput) {
    return this.inventoryService.createPurchaseOrder(data);
  }
}
