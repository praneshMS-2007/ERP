import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(private prisma: PrismaService) {}

  // A digital product can only ever be stocked in a VIRTUAL warehouse, and
  // a physical product only in a REAL one. Checked wherever a warehouse
  // assignment is made — the frontend also filters its dropdowns to match,
  // but that's just UX; this is the actual guarantee.
  private async assertWarehouseTypeMatches(warehouseId: string, isDigital: boolean) {
    const warehouse = await this.prisma.warehouse.findUnique({ where: { id: warehouseId } });
    if (!warehouse) throw new NotFoundException('Warehouse not found');

    if (isDigital && warehouse.type !== 'VIRTUAL') {
      throw new BadRequestException('A digital product can only be stocked in a Virtual warehouse.');
    }
    if (!isDigital && warehouse.type !== 'REAL') {
      throw new BadRequestException('A physical product can only be stocked in a Real warehouse.');
    }
  }

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
      include: {
        categoryRel: true,
        warehouseStock: { include: { warehouse: { select: { name: true } } } },
      },
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
      include: {
        stockMovements: { take: 10, orderBy: { date: 'desc' } },
        warehouseStock: { include: { warehouse: { select: { name: true } } } },
      },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  // Accepts the product's own fields plus a required initial warehouse
  // allocation (warehouseId + initialQuantity) — every product must be
  // assigned to a real location the moment it's created, so the
  // per-warehouse breakdown can never start out orphaned the way the
  // original seed products were.
  async createProduct(data: Prisma.ProductUncheckedCreateInput & { warehouseId?: string; initialQuantity?: number }) {
    const { warehouseId, initialQuantity, ...productData } = data;
    if (!warehouseId) throw new BadRequestException('Choose which warehouse this product is stored in.');
    const quantity = initialQuantity ?? productData.stockLevel ?? 0;

    if (productData.sku) {
      const existing = await this.prisma.product.findUnique({ where: { sku: productData.sku } });
      if (existing) throw new BadRequestException(`SKU "${productData.sku}" is already in use by another product.`);
    }

    await this.assertWarehouseTypeMatches(warehouseId, !!productData.isDigital);

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({ data: { ...productData, stockLevel: quantity } });
      await tx.warehouseStock.create({ data: { warehouseId, productId: product.id, quantity } });

      if (quantity > 0) {
        await tx.stockMovement.create({
          data: { productId: product.id, warehouseId, changeAmount: quantity, reason: 'ADJUSTMENT', date: new Date() },
        });
      }

      return product;
    });
  }

  async updateProduct(id: string, data: Prisma.ProductUncheckedUpdateInput) {
    return this.prisma.product.update({ where: { id }, data });
  }

  async deleteProduct(id: string) {
    await this.prisma.product.delete({ where: { id } });
    return { message: 'Product deleted' };
  }

  // Records one sale of `quantity` units, fulfilled from a specific
  // warehouse — decrements both that warehouse's stock and the product's
  // company-wide total together, and logs a StockMovement(reason: SALE) so
  // it shows up in the product's sale history.
  async sellProduct(productId: string, warehouseId: string, quantity: number) {
    if (!quantity || quantity <= 0) throw new BadRequestException('Quantity must be greater than zero.');

    const stock = await this.prisma.warehouseStock.findUnique({
      where: { warehouseId_productId: { warehouseId, productId } },
    });
    if (!stock || stock.quantity < quantity) {
      throw new BadRequestException(
        `Only ${stock?.quantity ?? 0} units of this product are available at that warehouse — cannot sell ${quantity}.`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.update({
        where: { id: productId },
        data: { stockLevel: { decrement: quantity } },
      });

      await tx.warehouseStock.update({
        where: { warehouseId_productId: { warehouseId, productId } },
        data: { quantity: { decrement: quantity } },
      });

      await tx.stockMovement.create({
        data: { productId, warehouseId, changeAmount: -quantity, reason: 'SALE', date: new Date() },
      });

      this.logger.log(`Sold ${quantity} units of product ${productId} from warehouse ${warehouseId}`);
      return product;
    });
  }

  // Adds stock to a specific warehouse for a product — the counterpart to
  // sellProduct, for allocating stock outside a formal Purchase Order (e.g.
  // assigning a warehouse to a product for the first time, or a manual
  // count correction). Logged as ADJUSTMENT, not RESTOCK, since it isn't
  // tied to any PurchaseOrder.
  async addProductStock(productId: string, warehouseId: string, quantity: number) {
    if (!quantity || quantity <= 0) throw new BadRequestException('Quantity must be greater than zero.');

    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');
    await this.assertWarehouseTypeMatches(warehouseId, product.isDigital);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { id: productId },
        data: { stockLevel: { increment: quantity } },
      });

      await tx.warehouseStock.upsert({
        where: { warehouseId_productId: { warehouseId, productId } },
        update: { quantity: { increment: quantity } },
        create: { warehouseId, productId, quantity },
      });

      await tx.stockMovement.create({
        data: { productId, warehouseId, changeAmount: quantity, reason: 'ADJUSTMENT', date: new Date() },
      });

      this.logger.log(`Added ${quantity} units of product ${productId} to warehouse ${warehouseId}`);
      return updated;
    });
  }

  async getProductSaleHistory(productId: string) {
    return this.prisma.stockMovement.findMany({
      where: { productId, reason: 'SALE' },
      include: { warehouse: { select: { name: true } } },
      orderBy: { date: 'desc' },
    });
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

    // Once delivered, a PO is done — same as a paid Payroll or a paid
    // Invoice can't un-happen. Without this, flipping DELIVERED -> anything
    // -> DELIVERED again would re-run the restock below a second time for
    // the same units, since the guard only ever checked "not currently
    // DELIVERED," not "never delivered before."
    if (po.status === 'DELIVERED') {
      throw new BadRequestException('This purchase order has already been delivered and its stock received — its status can no longer be changed.');
    }

    if (status === 'DELIVERED') {
      return this.prisma.$transaction(async (tx) => {
        const updatedPO = await tx.purchaseOrder.update({
          where: { id },
          data: { status },
        });

        await tx.product.update({
          where: { id: po.productId },
          data: { stockLevel: { increment: po.quantity } },
        });

        // Land the restock in the PO's target warehouse too, so the
        // per-warehouse breakdown never drifts from the product's total —
        // upsert since this may be the first stock this product has ever
        // had at that location.
        if (po.warehouseId) {
          await tx.warehouseStock.upsert({
            where: { warehouseId_productId: { warehouseId: po.warehouseId, productId: po.productId } },
            update: { quantity: { increment: po.quantity } },
            create: { warehouseId: po.warehouseId, productId: po.productId, quantity: po.quantity },
          });
        }

        await tx.stockMovement.create({
          data: {
            productId: po.productId,
            warehouseId: po.warehouseId,
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
  // "Used capacity" is never stored — it's always the live sum of whatever
  // is actually sitting in this warehouse right now, so it can never drift
  // out of sync the way a separately-tracked counter could.
  private sumCapacityUsed(productStock: { quantity: number }[], rawMaterialStock: { quantity: number }[]) {
    const productUnits = productStock.reduce((sum, s) => sum + s.quantity, 0);
    const materialUnits = rawMaterialStock.reduce((sum, s) => sum + s.quantity, 0);
    return productUnits + materialUnits;
  }

  async getWarehouses() {
    const warehouses = await this.prisma.warehouse.findMany({
      include: { productStock: { select: { quantity: true } }, rawMaterialStock: { select: { quantity: true } } },
      orderBy: { name: 'asc' },
    });

    return warehouses.map(({ productStock, rawMaterialStock, ...w }) => ({
      ...w,
      capacityUsed: this.sumCapacityUsed(productStock, rawMaterialStock),
    }));
  }

  async getWarehouseDetail(id: string) {
    const warehouse = await this.prisma.warehouse.findUnique({
      where: { id },
      include: {
        productStock: { include: { product: { select: { name: true, sku: true, status: true } } } },
        rawMaterialStock: { include: { rawMaterial: { select: { name: true, code: true, unit: true } } } },
      },
    });
    if (!warehouse) throw new NotFoundException('Warehouse not found');

    const { productStock, rawMaterialStock, ...w } = warehouse;
    return { ...w, capacityUsed: this.sumCapacityUsed(productStock, rawMaterialStock), productStock, rawMaterialStock };
  }

  async createWarehouse(data: Prisma.WarehouseUncheckedCreateInput) {
    return this.prisma.warehouse.create({ data });
  }

  async updateWarehouse(id: string, data: Prisma.WarehouseUncheckedUpdateInput) {
    return this.prisma.warehouse.update({ where: { id }, data });
  }

  // Server-side proxy for Nominatim (OpenStreetMap's geocoder) — called
  // from the map picker's address search. Proxied rather than called
  // directly from the browser so we can send the descriptive User-Agent
  // Nominatim's usage policy requires, and so a bad/slow response never
  // depends on the client's own network/CORS setup.
  async geocode(query: string) {
    if (!query || !query.trim()) throw new BadRequestException('Enter an address or place name to search.');

    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'ShuroqERP/1.0 (internal warehouse location picker)' },
    });
    if (!response.ok) throw new BadRequestException('Could not reach the location search service.');

    const results = (await response.json()) as Array<{ lat: string; lon: string; display_name: string }>;
    if (!results.length) throw new NotFoundException('No location found for that search.');

    return { latitude: parseFloat(results[0].lat), longitude: parseFloat(results[0].lon), displayName: results[0].display_name };
  }

  // Same proxy pattern as geocode() above, but resolving a pin's coordinates
  // back to a real address — called every time the map picker's marker
  // moves (drag, click, "My Location"), not just on an explicit search.
  async reverseGeocode(lat: number, lng: number) {
    if (Number.isNaN(lat) || Number.isNaN(lng)) throw new BadRequestException('Invalid coordinates.');

    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'ShuroqERP/1.0 (internal warehouse location picker)' },
    });
    if (!response.ok) throw new BadRequestException('Could not reach the location search service.');

    const result = (await response.json()) as { display_name?: string };
    if (!result.display_name) throw new NotFoundException('No address found for that location.');

    return { displayName: result.display_name };
  }

  // ========== RAW MATERIALS ==========
  async getRawMaterials() {
    return this.prisma.rawMaterial.findMany({
      include: { warehouseStock: { include: { warehouse: { select: { name: true } } } } },
      orderBy: { name: 'asc' },
    });
  }

  // Every raw material must be assigned to a real warehouse the moment
  // it's created — same rule, and the same reason, as createProduct above.
  // Materials are always physical, so the warehouse must be REAL (reusing
  // assertWarehouseTypeMatches with isDigital: false gets that for free).
  async createRawMaterial(data: Prisma.RawMaterialUncheckedCreateInput & { warehouseId?: string; initialQuantity?: number }) {
    const { warehouseId, initialQuantity, ...materialData } = data;
    if (!warehouseId) throw new BadRequestException('Choose which warehouse this raw material is stored in.');
    const quantity = initialQuantity ?? materialData.quantity ?? 0;

    await this.assertWarehouseTypeMatches(warehouseId, false);

    return this.prisma.$transaction(async (tx) => {
      const material = await tx.rawMaterial.create({ data: { ...materialData, quantity } });
      await tx.warehouseRawMaterialStock.create({ data: { warehouseId, rawMaterialId: material.id, quantity } });

      if (quantity > 0) {
        await tx.rawMaterialMovement.create({
          data: { rawMaterialId: material.id, warehouseId, changeAmount: quantity, reason: 'ADJUSTMENT', date: new Date() },
        });
      }

      return material;
    });
  }

  async updateRawMaterial(id: string, data: Prisma.RawMaterialUncheckedUpdateInput) {
    return this.prisma.rawMaterial.update({ where: { id }, data });
  }

  async deleteRawMaterial(id: string) {
    await this.prisma.rawMaterial.delete({ where: { id } });
    return { message: 'Raw material deleted' };
  }

  // Increases or decreases a raw material's stock at one warehouse — the
  // same +/- action for both directions, since "adjust" is symmetric
  // (unlike a product sale, which only ever goes down).
  async adjustRawMaterialStock(id: string, warehouseId: string, delta: number) {
    if (!delta) throw new BadRequestException('Adjustment amount cannot be zero.');

    const material = await this.prisma.rawMaterial.findUnique({ where: { id } });
    if (!material) throw new NotFoundException('Raw material not found');

    if (delta < 0) {
      const stock = await this.prisma.warehouseRawMaterialStock.findUnique({
        where: { warehouseId_rawMaterialId: { warehouseId, rawMaterialId: id } },
      });
      if (!stock || stock.quantity < -delta) {
        throw new BadRequestException(
          `Only ${stock?.quantity ?? 0} units are available at that warehouse — cannot remove ${-delta}.`,
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.rawMaterial.update({ where: { id }, data: { quantity: { increment: delta } } });

      await tx.warehouseRawMaterialStock.upsert({
        where: { warehouseId_rawMaterialId: { warehouseId, rawMaterialId: id } },
        update: { quantity: { increment: delta } },
        create: { warehouseId, rawMaterialId: id, quantity: delta },
      });

      await tx.rawMaterialMovement.create({
        data: { rawMaterialId: id, warehouseId, changeAmount: delta, reason: 'ADJUSTMENT', date: new Date() },
      });

      return updated;
    });
  }

  async getRawMaterialAdditionsHistory() {
    return this.prisma.rawMaterialMovement.findMany({
      where: { changeAmount: { gt: 0 } },
      include: { rawMaterial: { select: { name: true, code: true, unit: true } }, warehouse: { select: { name: true } } },
      orderBy: { date: 'desc' },
    });
  }

  // ========== SALES ORDERS ==========
  async getSalesOrders(status?: any) {
    const where = status ? { status } : {};
    return this.prisma.salesOrder.findMany({
      where,
      include: {
        customer: { select: { name: true, company: true } },
        product: { select: { name: true, sku: true } },
        warehouse: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createSalesOrder(data: Prisma.SalesOrderUncheckedCreateInput) {
    const count = await this.prisma.salesOrder.count();
    const orderNo = data.orderNo || `SO-2026-${String(count + 1).padStart(3, '0')}`;
    return this.prisma.salesOrder.create({ data: { ...data, orderNo } });
  }

  // Stock only actually moves once an order is marked DELIVERED — same
  // "moves on delivery, not on creation" rule as a PurchaseOrder's
  // updatePurchaseOrderStatus above, and the same guard-then-transaction
  // shape as sellProduct: verify the warehouse really has enough of this
  // product, then decrement both the warehouse and the product's total,
  // logging a StockMovement(reason: SALE) — so a sale made through an
  // order and a sale made through the Products page's "Sell" button land
  // in the exact same history.
  async updateSalesOrderStatus(id: string, status: any) {
    const order = await this.prisma.salesOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Sales order not found');

    if (status === 'DELIVERED' && order.status !== 'DELIVERED') {
      if (!order.productId || !order.warehouseId || !order.quantity) {
        throw new BadRequestException('This order has no product, warehouse, or quantity to fulfill.');
      }

      const stock = await this.prisma.warehouseStock.findUnique({
        where: { warehouseId_productId: { warehouseId: order.warehouseId, productId: order.productId } },
      });
      if (!stock || stock.quantity < order.quantity) {
        throw new BadRequestException(
          `Only ${stock?.quantity ?? 0} units of this product are available at that warehouse — cannot fulfill ${order.quantity}.`,
        );
      }

      return this.prisma.$transaction(async (tx) => {
        const updated = await tx.salesOrder.update({ where: { id }, data: { status } });

        await tx.product.update({
          where: { id: order.productId! },
          data: { stockLevel: { decrement: order.quantity! } },
        });

        await tx.warehouseStock.update({
          where: { warehouseId_productId: { warehouseId: order.warehouseId!, productId: order.productId! } },
          data: { quantity: { decrement: order.quantity! } },
        });

        await tx.stockMovement.create({
          data: {
            productId: order.productId!,
            warehouseId: order.warehouseId!,
            changeAmount: -order.quantity!,
            reason: 'SALE',
            date: new Date(),
          },
        });

        this.logger.log(`Sales order ${id} delivered: sold ${order.quantity} units of product ${order.productId}`);
        return updated;
      });
    }

    return this.prisma.salesOrder.update({
      where: { id },
      data: { status },
    });
  }

  async getSalesHistory() {
    return this.prisma.stockMovement.findMany({
      where: { reason: 'SALE' },
      include: { product: { select: { name: true, sku: true } }, warehouse: { select: { name: true } } },
      orderBy: { date: 'desc' },
    });
  }

  // The mirror image of getSalesHistory — everything that came IN
  // (RESTOCK from a delivered PO, ADJUSTMENT from Add Stock or a new
  // product's initial allocation), never what went out.
  async getProductAdditionsHistory() {
    return this.prisma.stockMovement.findMany({
      where: { changeAmount: { gt: 0 } },
      include: { product: { select: { name: true, sku: true } }, warehouse: { select: { name: true } } },
      orderBy: { date: 'desc' },
    });
  }

  // Every real thing that has happened to stock recently — additions
  // (RESTOCK from a delivered PO, ADJUSTMENT from Add Stock) and removals
  // (SALE) alike, across every product. This is what actually moved,
  // unlike a Purchase Order's own status (which can sit at "ORDERED" for
  // days without a single unit having moved anywhere yet).
  async getRecentStockActivity(limit = 10) {
    return this.prisma.stockMovement.findMany({
      include: { product: { select: { name: true, sku: true } }, warehouse: { select: { name: true } } },
      orderBy: { date: 'desc' },
      take: limit,
    });
  }
}
