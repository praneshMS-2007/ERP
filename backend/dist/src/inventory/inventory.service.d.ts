import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
export declare class InventoryService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    getCategories(): Promise<({
        _count: {
            products: number;
        };
    } & {
        id: string;
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
    })[]>;
    createCategory(data: {
        name: string;
        description?: string;
    }): Promise<{
        id: string;
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    getProducts(category?: string, status?: any): Promise<({
        categoryRel: {
            id: string;
            name: string;
            description: string | null;
            createdAt: Date;
            updatedAt: Date;
        } | null;
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.ProductStatus;
        category: string;
        sku: string;
        categoryId: string | null;
        price: number;
        costPrice: number | null;
        stockLevel: number;
        minStockLevel: number;
        unit: string;
    })[]>;
    getStockAlerts(): Promise<{
        id: string;
        sku: string;
        name: string;
        category: string;
        stockLevel: number;
        minStockLevel: number;
        unit: string;
        severity: string;
    }[]>;
    getProduct(id: string): Promise<{
        stockMovements: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            productId: string;
            date: Date;
            reason: import(".prisma/client").$Enums.MovementReason;
            changeAmount: number;
        }[];
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.ProductStatus;
        category: string;
        sku: string;
        categoryId: string | null;
        price: number;
        costPrice: number | null;
        stockLevel: number;
        minStockLevel: number;
        unit: string;
    }>;
    createProduct(data: Prisma.ProductUncheckedCreateInput): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.ProductStatus;
        category: string;
        sku: string;
        categoryId: string | null;
        price: number;
        costPrice: number | null;
        stockLevel: number;
        minStockLevel: number;
        unit: string;
    }>;
    updateProduct(id: string, data: Prisma.ProductUncheckedUpdateInput): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.ProductStatus;
        category: string;
        sku: string;
        categoryId: string | null;
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
    createSupplier(data: Prisma.SupplierUncheckedCreateInput): Promise<{
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
        supplier: {
            name: string;
        };
        product: {
            name: string;
            sku: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.POStatus;
        orderNumber: string | null;
        quantity: number;
        totalAmount: number;
        orderDate: Date;
        supplierId: string;
        productId: string;
    })[]>;
    createPurchaseOrder(data: Prisma.PurchaseOrderUncheckedCreateInput): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.POStatus;
        orderNumber: string | null;
        quantity: number;
        totalAmount: number;
        orderDate: Date;
        supplierId: string;
        productId: string;
    }>;
    updatePurchaseOrderStatus(id: string, status: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.POStatus;
        orderNumber: string | null;
        quantity: number;
        totalAmount: number;
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
    getSalesOrders(status?: any): Promise<({
        customer: {
            name: string;
            company: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.OrderStatus;
        totalAmount: number;
        customerId: string;
        orderNo: string;
    })[]>;
    createSalesOrder(data: Prisma.SalesOrderUncheckedCreateInput): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.OrderStatus;
        totalAmount: number;
        customerId: string;
        orderNo: string;
    }>;
    updateSalesOrderStatus(id: string, status: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.OrderStatus;
        totalAmount: number;
        customerId: string;
        orderNo: string;
    }>;
}
