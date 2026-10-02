import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

/** The only routes an account on a temporary password may still reach. */
const ALLOWED = ['/auth/change-password', '/auth/me', '/auth/logout'];

/**
 * Accounts created in bulk start with a generated temporary password. Until
 * the person has chosen their own, every request except changing it (and
 * seeing who they are / signing out) is refused — enforced here on the server,
 * not just by the frontend redirect, so calling the API directly gets the same
 * answer.
 *
 * Runs after JwtAuthGuard (it needs request.user); public routes have no user
 * and pass straight through.
 */
@Injectable()
export class MustChangePasswordGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    if (!req.user?.mustChangePassword) return true;

    const path = String(req.originalUrl || req.url || '').split('?')[0].replace(/\/+$/, '');
    if (ALLOWED.some((a) => path.endsWith(a))) return true;

    throw new ForbiddenException({
      statusCode: 403,
      error: 'Forbidden',
      code: 'PASSWORD_CHANGE_REQUIRED',
      message: 'You must choose a new password before you can continue.',
    });
  }
}
