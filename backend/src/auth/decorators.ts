import { SetMetadata } from '@nestjs/common';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// ========== @Public() ==========
// Marks a route as publicly accessible (no JWT required)
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// ========== @RequirePermission(module, action) ==========
// Declares what permission a route requires
export const PERMISSION_KEY = 'requiredPermission';
export interface RequiredPermission {
  module: string;
  action: string;
}
export const RequirePermission = (module: string, action: string) =>
  SetMetadata(PERMISSION_KEY, { module, action } as RequiredPermission);

// ========== @CurrentUser() ==========
// Parameter decorator to extract the current user from the request
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
