import { InventoryService } from './inventory.service';
import { Prisma } from '@prisma/client';
export declare class InventoryController {
    private readonly inventoryService;
    constructor(inventoryService: InventoryService);
    getProducts(category?: string, status?: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.ProductStatus;
        sku: string;
        category: string;
        price: number;
        costPrice: number | null;
        stockLevel: number;
        minStockLevel: number;
        unit: string;
    }[]>;
    getProduct(id: string): Promise<{
        stockMovements: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            date: Date;
            reason: import(".prisma/client").$Enums.MovementReason;
            productId: string;
            changeAmount: number;
        }[];
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.ProductStatus;
        sku: string;
        category: string;
        price: number;
        costPrice: number | null;
        stockLevel: number;
        minStockLevel: number;
        unit: string;
    }>;
    createProduct(data: Prisma.ProductCreateInput): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.ProductStatus;
        sku: string;
        category: string;
        price: number;
        costPrice: number | null;
        stockLevel: number;
        minStockLevel: number;
        unit: string;
    }>;
    updateProduct(id: string, data: Prisma.ProductUpdateInput): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.ProductStatus;
        sku: string;
        category: string;
        price: number;
        costPrice: number | null;
        stockLevel: number;
        minStockLevel: number;
        unit: string;
    }>;
    deleteProduct(id: string): Promise<{
        message: string;
    }>;
    getSuppliers(): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        email: string | null;
        address: string | null;
        city: string | null;
        country: string | null;
        status: import(".prisma/client").$Enums.SupplierStatus;
        phone: string | null;
        contactPerson: string | null;
    }[]>;
    createSupplier(data: Prisma.SupplierCreateInput): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        email: string | null;
        address: string | null;
        city: string | null;
        country: string | null;
        status: import(".prisma/client").$Enums.SupplierStatus;
        phone: string | null;
        contactPerson: string | null;
    }>;
    getPurchaseOrders(): Promise<({
        product: {
            name: string;
            sku: string;
        };
        supplier: {
            name: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.POStatus;
        quantity: number;
        orderDate: Date;
        supplierId: string;
        productId: string;
    })[]>;
    createPurchaseOrder(data: Prisma.PurchaseOrderUncheckedCreateInput): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.POStatus;
        quantity: number;
        orderDate: Date;
        supplierId: string;
        productId: string;
    }>;
    updatePurchaseOrderStatus(id: string, status: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.POStatus;
        quantity: number;
        orderDate: Date;
        supplierId: string;
        productId: string;
    }>;
    getWarehouses(): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        location: string;
        capacity: number;
        manager: string | null;
    }[]>;
    createWarehouse(data: Prisma.WarehouseUncheckedCreateInput): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        location: string;
        capacity: number;
        manager: string | null;
    }>;
    getSalesOrders(status?: string): Promise<({
        customer: {
            name: string;
            company: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.OrderStatus;
        customerId: string;
        orderNo: string;
        totalAmount: number;
    })[]>;
    createSalesOrder(data: Prisma.SalesOrderUncheckedCreateInput): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.OrderStatus;
        customerId: string;
        orderNo: string;
        totalAmount: number;
    }>;
    updateSalesOrderStatus(id: string, status: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.OrderStatus;
        customerId: string;
        orderNo: string;
        totalAmount: number;
    }>;
}
