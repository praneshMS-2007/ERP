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
exports.CrmController = void 0;
const common_1 = require("@nestjs/common");
const crm_service_1 = require("./crm.service");
const client_1 = require("@prisma/client");
const decorators_1 = require("../auth/decorators");
let CrmController = class CrmController {
    crmService;
    constructor(crmService) {
        this.crmService = crmService;
    }
    getLeads(status) {
        return this.crmService.getLeads(status);
    }
    createLead(data) {
        return this.crmService.createLead(data);
    }
    updateLead(id, data) {
        return this.crmService.updateLead(id, data);
    }
    deleteLead(id) {
        return this.crmService.deleteLead(id);
    }
    convertLeadToCustomer(id) {
        return this.crmService.convertLeadToCustomer(id);
    }
    getCustomers() {
        return this.crmService.getCustomers();
    }
    createCustomer(data) {
        return this.crmService.createCustomer(data);
    }
    updateCustomer(id, data) {
        return this.crmService.updateCustomer(id, data);
    }
    deleteCustomer(id) {
        return this.crmService.deleteCustomer(id);
    }
    getOpportunities(stage) {
        return this.crmService.getOpportunities(stage);
    }
    getSupportTickets(status) {
        return this.crmService.getSupportTickets(status);
    }
    createSupportTicket(data) {
        return this.crmService.createSupportTicket(data);
    }
    updateSupportTicketStatus(id, status) {
        return this.crmService.updateSupportTicketStatus(id, status);
    }
    getFollowUps() {
        return this.crmService.getFollowUps();
    }
    createFollowUp(data) {
        return this.crmService.createFollowUp(data);
    }
};
exports.CrmController = CrmController;
__decorate([
    (0, common_1.Get)('leads'),
    (0, decorators_1.RequirePermission)('CRM', 'READ'),
    __param(0, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CrmController.prototype, "getLeads", null);
__decorate([
    (0, common_1.Post)('leads'),
    (0, decorators_1.RequirePermission)('CRM', 'WRITE'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CrmController.prototype, "createLead", null);
__decorate([
    (0, common_1.Put)('leads/:id'),
    (0, decorators_1.RequirePermission)('CRM', 'WRITE'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CrmController.prototype, "updateLead", null);
__decorate([
    (0, common_1.Delete)('leads/:id'),
    (0, decorators_1.RequirePermission)('CRM', 'DELETE'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CrmController.prototype, "deleteLead", null);
__decorate([
    (0, common_1.Post)('leads/:id/convert'),
    (0, decorators_1.RequirePermission)('CRM', 'WRITE'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CrmController.prototype, "convertLeadToCustomer", null);
__decorate([
    (0, common_1.Get)('customers'),
    (0, decorators_1.RequirePermission)('CRM', 'READ'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CrmController.prototype, "getCustomers", null);
__decorate([
    (0, common_1.Post)('customers'),
    (0, decorators_1.RequirePermission)('CRM', 'WRITE'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CrmController.prototype, "createCustomer", null);
__decorate([
    (0, common_1.Put)('customers/:id'),
    (0, decorators_1.RequirePermission)('CRM', 'WRITE'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CrmController.prototype, "updateCustomer", null);
__decorate([
    (0, common_1.Delete)('customers/:id'),
    (0, decorators_1.RequirePermission)('CRM', 'DELETE'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CrmController.prototype, "deleteCustomer", null);
__decorate([
    (0, common_1.Get)('opportunities'),
    (0, decorators_1.RequirePermission)('CRM', 'READ'),
    __param(0, (0, common_1.Query)('stage')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CrmController.prototype, "getOpportunities", null);
__decorate([
    (0, common_1.Get)('tickets'),
    (0, decorators_1.RequirePermission)('CRM', 'READ'),
    __param(0, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CrmController.prototype, "getSupportTickets", null);
__decorate([
    (0, common_1.Post)('tickets'),
    (0, decorators_1.RequirePermission)('CRM', 'WRITE'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CrmController.prototype, "createSupportTicket", null);
__decorate([
    (0, common_1.Put)('tickets/:id/status'),
    (0, decorators_1.RequirePermission)('CRM', 'WRITE'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CrmController.prototype, "updateSupportTicketStatus", null);
__decorate([
    (0, common_1.Get)('follow-ups'),
    (0, decorators_1.RequirePermission)('CRM', 'READ'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CrmController.prototype, "getFollowUps", null);
__decorate([
    (0, common_1.Post)('follow-ups'),
    (0, decorators_1.RequirePermission)('CRM', 'WRITE'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CrmController.prototype, "createFollowUp", null);
exports.CrmController = CrmController = __decorate([
    (0, common_1.Controller)('crm'),
    __metadata("design:paramtypes", [crm_service_1.CrmService])
], CrmController);
//# sourceMappingURL=crm.controller.js.map