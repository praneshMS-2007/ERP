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
Object.defineProperty(exports, "__esModule", { value: true });
exports.RolesGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const decorators_1 = require("./decorators");
let RolesGuard = class RolesGuard {
    reflector;
    constructor(reflector) {
        this.reflector = reflector;
    }
    canActivate(context) {
        const isPublic = this.reflector.getAllAndOverride(decorators_1.IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic)
            return true;
        const requiredPermission = this.reflector.getAllAndOverride(decorators_1.PERMISSION_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (!requiredPermission)
            return true;
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        if (!user || !user.permissions) {
            throw new common_1.ForbiddenException('Access denied: No permissions found');
        }
        if (user.role === 'SUPER_ADMIN')
            return true;
        const hasPermission = user.permissions.some((p) => p.module === requiredPermission.module &&
            (p.action === requiredPermission.action || p.action === 'ALL'));
        if (!hasPermission) {
            throw new common_1.ForbiddenException(`Access denied: Requires ${requiredPermission.action} permission on ${requiredPermission.module} module`);
        }
        return true;
    }
};
exports.RolesGuard = RolesGuard;
exports.RolesGuard = RolesGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector])
], RolesGuard);
//# sourceMappingURL=roles.guard.js.map