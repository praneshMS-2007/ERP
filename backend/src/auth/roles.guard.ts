import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY, RequiredPermission, ROLE_KEY, IS_PUBLIC_KEY } from './decorators';
import { hasModuleAccess } from './permission.util';

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

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Check if the route has a @RequireRole() decorator
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (requiredRoles && requiredRoles.length > 0) {
      if (!user || !user.role) {
        throw new ForbiddenException('Access denied: Authentication required');
      }
      if (!requiredRoles.includes(user.role)) {
        throw new ForbiddenException(
          `Access denied: Restricted to ${requiredRoles.join(', ')} only`,
        );
      }
    }

    // Check if the route has a @RequirePermission() decorator
    const requiredPermission = this.reflector.getAllAndOverride<RequiredPermission>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no permission required, allow access (only JWT auth / role check needed)
    if (!requiredPermission) return true;

    if (!user) {
      throw new ForbiddenException('Access denied: No permissions found');
    }

    if (!hasModuleAccess(user, requiredPermission.module, requiredPermission.action)) {
      throw new ForbiddenException(
        `Access denied: Requires ${requiredPermission.action} permission on ${requiredPermission.module} module`,
      );
    }

    return true;
  }
}
