import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditService } from './audit.service';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// POST routes that don't change any business record — a chat message isn't
// a mutation, and logging one on every message would bury the real audit
// trail (an employee edit, a payroll release) in noise.
const NON_MUTATING_PATHS = new Set(['/api/ai/chat', '/api/search']);

/** First real path segment after /api, mapped to the Module this action belongs to. */
const PATH_TO_MODULE: Record<string, string> = {
  hrm: 'HR',
  crm: 'CRM',
  inventory: 'INVENTORY',
  finance: 'FINANCE',
  projects: 'PROJECTS',
  analytics: 'ANALYTICS',
  users: 'ADMIN',
  auth: 'ADMIN',
  notifications: 'ADMIN',
};

function moduleForPath(path: string): string {
  const segment = path.replace(/^\/?api\/?/, '').split('/')[0];
  return PATH_TO_MODULE[segment] ?? segment.toUpperCase() ?? 'OTHER';
}

/**
 * Writes an AuditLog row for every successful authenticated mutation,
 * app-wide — registered once as a global interceptor rather than added
 * controller by controller, so a new mutating route can't ship without a
 * trail simply because someone forgot to wire it up.
 *
 * Deliberately skips:
 * - Read requests (GET) — logging those would make the table pure noise
 *   for no investigative value.
 * - Failed requests — a 4xx/5xx response never reaches the `tap` below,
 *   since it's on the success channel of the observable.
 * - Unauthenticated requests (no request.user) — covers @Public() routes
 *   like login/logout, which are audited explicitly and with more useful
 *   context directly in AuthService, since at interceptor time an
 *   in-flight login has no authenticated actor to attribute the row to yet.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private audit: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method as string;
    const rawPath: string = request.route?.path || request.path || request.url;

    if (!MUTATING_METHODS.has(method) || NON_MUTATING_PATHS.has(rawPath)) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(() => {
        const user = request.user;
        if (!user) return; // public routes — audited explicitly where it matters

        const entityId: string | undefined = request.params?.id;

        this.audit.log({
          userId: user.id,
          action: `${method} ${rawPath}`,
          module: moduleForPath(rawPath),
          entityId,
          ipAddress: request.ip || request.headers?.['x-forwarded-for'] || null,
        });
      }),
    );
  }
}
