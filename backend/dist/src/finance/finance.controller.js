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
exports.FinanceController = void 0;
const common_1 = require("@nestjs/common");
const finance_service_1 = require("./finance.service");
const decorators_1 = require("../auth/decorators");
let FinanceController = class FinanceController {
    financeService;
    constructor(financeService) {
        this.financeService = financeService;
    }
    async getDashboardMetrics() {
        return this.financeService.getDashboardMetrics();
    }
    async getExpenses() {
        return this.financeService.getExpenses();
    }
    async createExpense(data) {
        return this.financeService.createExpense(data);
    }
    async getInvoices() {
        return this.financeService.getInvoices();
    }
    async createInvoice(data) {
        return this.financeService.createInvoice(data);
    }
    async getIncomes() {
        return this.financeService.getIncomes();
    }
    async createIncome(data) {
        return this.financeService.createIncome(data);
    }
    async getBudgets() {
        return this.financeService.getBudgets();
    }
    async getPayments() {
        return this.financeService.getPayments();
    }
    async createPayment(data) {
        return this.financeService.createPayment(data);
    }
    async getLedgerEntries() {
        return this.financeService.getLedgerEntries();
    }
    async createLedgerEntry(data) {
        return this.financeService.createLedgerEntry(data);
    }
    async getTaxRecords() {
        return this.financeService.getTaxRecords();
    }
    async createTaxRecord(data) {
        return this.financeService.createTaxRecord(data);
    }
    async updateTaxStatus(id, status) {
        return this.financeService.updateTaxStatus(id, status);
    }
};
exports.FinanceController = FinanceController;
__decorate([
    (0, common_1.Get)('dashboard'),
    (0, decorators_1.RequirePermission)('FINANCE', 'READ'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "getDashboardMetrics", null);
__decorate([
    (0, common_1.Get)('expenses'),
    (0, decorators_1.RequirePermission)('FINANCE', 'READ'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "getExpenses", null);
__decorate([
    (0, common_1.Post)('expenses'),
    (0, decorators_1.RequirePermission)('FINANCE', 'WRITE'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "createExpense", null);
__decorate([
    (0, common_1.Get)('invoices'),
    (0, decorators_1.RequirePermission)('FINANCE', 'READ'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "getInvoices", null);
__decorate([
    (0, common_1.Post)('invoices'),
    (0, decorators_1.RequirePermission)('FINANCE', 'WRITE'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "createInvoice", null);
__decorate([
    (0, common_1.Get)('incomes'),
    (0, decorators_1.RequirePermission)('FINANCE', 'READ'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "getIncomes", null);
__decorate([
    (0, common_1.Post)('incomes'),
    (0, decorators_1.RequirePermission)('FINANCE', 'WRITE'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "createIncome", null);
__decorate([
    (0, common_1.Get)('budgets'),
    (0, decorators_1.RequirePermission)('FINANCE', 'READ'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "getBudgets", null);
__decorate([
    (0, common_1.Get)('payments'),
    (0, decorators_1.RequirePermission)('FINANCE', 'READ'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "getPayments", null);
__decorate([
    (0, common_1.Post)('payments'),
    (0, decorators_1.RequirePermission)('FINANCE', 'WRITE'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "createPayment", null);
__decorate([
    (0, common_1.Get)('ledger'),
    (0, decorators_1.RequirePermission)('FINANCE', 'READ'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "getLedgerEntries", null);
__decorate([
    (0, common_1.Post)('ledger'),
    (0, decorators_1.RequirePermission)('FINANCE', 'WRITE'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "createLedgerEntry", null);
__decorate([
    (0, common_1.Get)('taxes'),
    (0, decorators_1.RequirePermission)('FINANCE', 'READ'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "getTaxRecords", null);
__decorate([
    (0, common_1.Post)('taxes'),
    (0, decorators_1.RequirePermission)('FINANCE', 'WRITE'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "createTaxRecord", null);
__decorate([
    (0, common_1.Put)('taxes/:id/status'),
    (0, decorators_1.RequirePermission)('FINANCE', 'WRITE'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "updateTaxStatus", null);
exports.FinanceController = FinanceController = __decorate([
    (0, common_1.Controller)('finance'),
    __metadata("design:paramtypes", [finance_service_1.FinanceService])
], FinanceController);
//# sourceMappingURL=finance.controller.js.map