import { SearchService } from './search.service';
export declare class SearchController {
    private readonly searchService;
    constructor(searchService: SearchService);
    search(query: string): Promise<{
        employees: {
            id: string;
            empCode: string | null;
            firstName: string;
            lastName: string;
        }[];
        products: {
            id: string;
            name: string;
            sku: string;
            price: number;
            stockLevel: number;
        }[];
        customers: {
            id: string;
            name: string;
            email: string | null;
            company: string | null;
        }[];
        invoices: {
            id: string;
            status: import(".prisma/client").$Enums.InvoiceStatus;
            amount: number;
            invoiceNo: string;
            clientName: string;
        }[];
        projects: {
            id: string;
            name: string;
            status: import(".prisma/client").$Enums.ProjectStatus;
            progress: number;
        }[];
    }>;
}
