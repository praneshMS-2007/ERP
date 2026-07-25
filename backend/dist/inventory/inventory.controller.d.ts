import { InventoryService } from './inventory.service';
import { Prisma } from '@prisma/client';
export declare class InventoryController {
    private readonly inventoryService;
    constructor(inventoryService: InventoryService);
    getProducts(category?: string, status?: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.ProductStatus;
        name: string;
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
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.ProductStatus;
        name: string;
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
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.ProductStatus;
        name: string;
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
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.ProductStatus;
        name: string;
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
        email: string | null;
        createdAt: Date;
        updatedAt: Date;
        address: string | null;
        city: string | null;
        country: string | null;
        status: import(".prisma/client").$Enums.SupplierStatus;
        name: string;
        phone: string | null;
        contactPerson: string | null;
    }[]>;
    createSupplier(data: Prisma.SupplierCreateInput): Promise<{
        id: string;
        email: string | null;
        createdAt: Date;
        updatedAt: Date;
        address: string | null;
        city: string | null;
        country: string | null;
        status: import(".prisma/client").$Enums.SupplierStatus;
        name: string;
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
}
