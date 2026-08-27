import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

export interface JwtPayload {
  sub: string;      // user ID
  sid: string;      // this token's own Authentication row id — lets a specific
                     // session be revoked without touching any of the user's
                     // other sessions or waiting out the token's expiry
  email: string | null; // null for ERP-generated accounts with no mailbox yet
  role: string;      // role name
  permissions: { module: string; action: string }[];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: (() => {
        if (!process.env.JWT_SECRET) {
          throw new Error('JWT_SECRET environment variable is required. Set it in your .env file.');
        }
        return process.env.JWT_SECRET;
      })(),
    });
  }

  /**
   * Called after the JWT signature is verified — but a valid signature only
   * proves the token was issued by us, not that the account behind it is
   * still allowed in right now. Without this DB check, removing an employee
   * only blocked their *next login*: any session they already had open kept
   * working for the rest of the token's 24-hour life.
   *
   * The same reasoning applies one level down: a valid, active account can
   * still have had this ONE session revoked (Settings > Sessions > Revoke,
   * or an admin force-logging someone out). `payload.sid` is that session's
   * own Authentication row id, set once at login — checking it here is what
   * makes "Revoke" actually end the session immediately, rather than just
   * hiding it from the list while the token quietly keeps working.
   *
   * This adds one query per request. At this scale that costs nothing
   * measurable.
   */
  async validate(payload: JwtPayload) {
    const [user, session] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, isActive: true },
      }),
      this.prisma.authentication.findUnique({
        where: { id: payload.sid },
        select: { isActive: true, userId: true },
      }),
    ]);

    if (!user || !user.isActive || !session || !session.isActive || session.userId !== payload.sub) {
      throw new UnauthorizedException('This session is no longer valid. Please sign in again.');
    }

    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      permissions: payload.permissions,
    };
  }
}
