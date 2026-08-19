import { Controller, Get, Post, Body, Param, Put, Delete, Query } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { Prisma } from '@prisma/client';
import { RequirePermission } from '../auth/decorators';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('stock-alerts')
  @RequirePermission('INVENTORY', 'READ')
  getStockAlerts() {
    return this.inventoryService.getStockAlerts();
  }

  @Get('categories')
  @RequirePermission('INVENTORY', 'READ')
  getCategories() {
    return this.inventoryService.getCategories();
  }

  @Post('categories')
  @RequirePermission('INVENTORY', 'WRITE')
  createCategory(@Body() data: { name: string; description?: string }) {
    return this.inventoryService.createCategory(data);
  }

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
  createProduct(@Body() data: Prisma.ProductUncheckedCreateInput) {
    return this.inventoryService.createProduct(data);
  }

  @Put('products/:id')
  @RequirePermission('INVENTORY', 'WRITE')
  updateProduct(@Param('id') id: string, @Body() data: Prisma.ProductUncheckedUpdateInput) {
    return this.inventoryService.updateProduct(id, data);
  }

  @Delete('products/:id')
  @RequirePermission('INVENTORY', 'DELETE')
  deleteProduct(@Param('id') id: string) {
    return this.inventoryService.deleteProduct(id);
  }

  @Post('products/:id/sell')
  @RequirePermission('INVENTORY', 'WRITE')
  sellProduct(@Param('id') id: string, @Body() body: { warehouseId: string; quantity: number }) {
    return this.inventoryService.sellProduct(id, body.warehouseId, Number(body.quantity));
  }

  @Post('products/:id/add-stock')
  @RequirePermission('INVENTORY', 'WRITE')
  addProductStock(@Param('id') id: string, @Body() body: { warehouseId: string; quantity: number }) {
    return this.inventoryService.addProductStock(id, body.warehouseId, Number(body.quantity));
  }

  @Get('products/:id/sale-history')
  @RequirePermission('INVENTORY', 'READ')
  getProductSaleHistory(@Param('id') id: string) {
    return this.inventoryService.getProductSaleHistory(id);
  }

  @Get('suppliers')
  @RequirePermission('INVENTORY', 'READ')
  getSuppliers() {
    return this.inventoryService.getSuppliers();
  }

  @Post('suppliers')
  @RequirePermission('INVENTORY', 'WRITE')
  createSupplier(@Body() data: Prisma.SupplierUncheckedCreateInput) {
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

  @Get('geocode')
  @RequirePermission('INVENTORY', 'READ')
  geocode(@Query('q') q: string) {
    return this.inventoryService.geocode(q);
  }

  @Get('reverse-geocode')
  @RequirePermission('INVENTORY', 'READ')
  reverseGeocode(@Query('lat') lat: string, @Query('lng') lng: string) {
    return this.inventoryService.reverseGeocode(parseFloat(lat), parseFloat(lng));
  }

  @Get('warehouses')
  @RequirePermission('INVENTORY', 'READ')
  getWarehouses() {
    return this.inventoryService.getWarehouses();
  }

  @Get('warehouses/:id')
  @RequirePermission('INVENTORY', 'READ')
  getWarehouseDetail(@Param('id') id: string) {
    return this.inventoryService.getWarehouseDetail(id);
  }

  @Post('warehouses')
  @RequirePermission('INVENTORY', 'WRITE')
  createWarehouse(@Body() data: Prisma.WarehouseUncheckedCreateInput) {
    return this.inventoryService.createWarehouse(data);
  }

  @Put('warehouses/:id')
  @RequirePermission('INVENTORY', 'WRITE')
  updateWarehouse(@Param('id') id: string, @Body() data: Prisma.WarehouseUncheckedUpdateInput) {
    return this.inventoryService.updateWarehouse(id, data);
  }

  @Get('raw-materials')
  @RequirePermission('INVENTORY', 'READ')
  getRawMaterials() {
    return this.inventoryService.getRawMaterials();
  }

  @Post('raw-materials')
  @RequirePermission('INVENTORY', 'WRITE')
  createRawMaterial(@Body() data: Prisma.RawMaterialUncheckedCreateInput & { warehouseId?: string; initialQuantity?: number }) {
    return this.inventoryService.createRawMaterial(data);
  }

  @Put('raw-materials/:id')
  @RequirePermission('INVENTORY', 'WRITE')
  updateRawMaterial(@Param('id') id: string, @Body() data: Prisma.RawMaterialUncheckedUpdateInput) {
    return this.inventoryService.updateRawMaterial(id, data);
  }

  @Delete('raw-materials/:id')
  @RequirePermission('INVENTORY', 'DELETE')
  deleteRawMaterial(@Param('id') id: string) {
    return this.inventoryService.deleteRawMaterial(id);
  }

  @Put('raw-materials/:id/adjust')
  @RequirePermission('INVENTORY', 'WRITE')
  adjustRawMaterialStock(@Param('id') id: string, @Body() body: { warehouseId: string; delta: number }) {
    return this.inventoryService.adjustRawMaterialStock(id, body.warehouseId, Number(body.delta));
  }

  @Get('sales-history')
  @RequirePermission('INVENTORY', 'READ')
  getSalesHistory() {
    return this.inventoryService.getSalesHistory();
  }

  @Get('product-additions')
  @RequirePermission('INVENTORY', 'READ')
  getProductAdditionsHistory() {
    return this.inventoryService.getProductAdditionsHistory();
  }

  @Get('raw-material-additions')
  @RequirePermission('INVENTORY', 'READ')
  getRawMaterialAdditionsHistory() {
    return this.inventoryService.getRawMaterialAdditionsHistory();
  }

  @Get('stock-activity')
  @RequirePermission('INVENTORY', 'READ')
  getRecentStockActivity(@Query('limit') limit?: string) {
    return this.inventoryService.getRecentStockActivity(limit ? parseInt(limit) : undefined);
  }

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
