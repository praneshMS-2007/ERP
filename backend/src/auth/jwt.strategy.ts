import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

export interface JwtPayload {
  sub: string;      // user ID
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
   * This adds one query per request. At this scale that costs nothing
   * measurable, and it's what makes "removed employees have no access"
   * actually true rather than "true within 24 hours."
   */
  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, isActive: true },
    });

    if (!user || !user.isActive) {
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
