import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY, RequiredPermission, IS_PUBLIC_KEY } from './decorators';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Skip public routes
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    // Check if the route has a @RequirePermission() decorator
    const requiredPermission = this.reflector.getAllAndOverride<RequiredPermission>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no permission required, allow access (only JWT auth needed)
    if (!requiredPermission) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.permissions) {
      throw new ForbiddenException('Access denied: No permissions found');
    }

    // SUPER_ADMIN bypasses all permission checks
    if (user.role === 'SUPER_ADMIN') return true;

    // Check if user has the required permission
    const hasPermission = user.permissions.some(
      (p: { module: string; action: string }) =>
        p.module === requiredPermission.module &&
        (p.action === requiredPermission.action || p.action === 'ALL'),
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `Access denied: Requires ${requiredPermission.action} permission on ${requiredPermission.module} module`,
      );
    }

    return true;
  }
}
