"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurrentUser = exports.RequirePermission = exports.PERMISSION_KEY = exports.Public = exports.IS_PUBLIC_KEY = void 0;
const common_1 = require("@nestjs/common");
const common_2 = require("@nestjs/common");
exports.IS_PUBLIC_KEY = 'isPublic';
const Public = () => (0, common_1.SetMetadata)(exports.IS_PUBLIC_KEY, true);
exports.Public = Public;
exports.PERMISSION_KEY = 'requiredPermission';
const RequirePermission = (module, action) => (0, common_1.SetMetadata)(exports.PERMISSION_KEY, { module, action });
exports.RequirePermission = RequirePermission;
exports.CurrentUser = (0, common_2.createParamDecorator)((data, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
});
//# sourceMappingURL=decorators.js.map