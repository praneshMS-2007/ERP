import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { JwtPayload } from './jwt.strategy';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private audit: AuditService,
  ) {}

  /**
   * `identifier` is either an email (the original demo accounts) or a
   * generated username (ERP-provisioned employee accounts have no mailbox
   * yet — see credentials.ts). Both live in unique columns, so one lookup
   * covers both without ambiguity.
   *
   * Login/logout are audited explicitly here rather than relying on the
   * global AuditInterceptor — both routes are @Public(), so at the point
   * the interceptor runs there is no authenticated request.user yet to
   * attribute the row to. Here, the user is already looked up.
   */
  async login(identifier: string, passwordPlain: string, ipAddress?: string, deviceInfo?: string) {
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ email: identifier }, { username: identifier }] },
      include: {
        role: {
          include: { permissions: true },
        },
        employee: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(passwordPlain, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Checked after the password match so a wrong password always reads as
    // "invalid credentials" — this message only reaches someone who already
    // knows the right password, not a stranger probing for account names.
    if (!user.isActive) {
      throw new UnauthorizedException(
        'This account has been deactivated. Contact HR if you believe this is a mistake.',
      );
    }

    // Build JWT payload with permissions
    const permissions = user.role.permissions.map((p) => ({
      module: p.module,
      action: p.action,
    }));

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role.name,
      permissions,
    };

    const token = this.jwtService.sign(payload);

    // Store the session — deviceInfo/ipAddress come straight from this
    // request (User-Agent header, req.ip), not placeholder text, so the
    // Settings > Sessions list reflects what actually signed in.
    await this.prisma.authentication.create({
      data: {
        userId: user.id,
        token,
        deviceInfo,
        ipAddress,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24 hours
      },
    });

    this.audit.log({ userId: user.id, action: 'LOGIN', module: 'ADMIN', ipAddress });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role.name,
        permissions,
        name: user.employee
          ? `${user.employee.firstName} ${user.employee.lastName}`
          : 'Admin User',
      },
    };
  }

  async logout(token: string, ipAddress?: string) {
    const session = await this.prisma.authentication.findFirst({ where: { token }, select: { userId: true } });

    await this.prisma.authentication.updateMany({
      where: { token },
      data: { isActive: false },
    });

    if (session) {
      this.audit.log({ userId: session.userId, action: 'LOGOUT', module: 'ADMIN', ipAddress });
    }

    return { message: 'Logged out successfully' };
  }

  /**
   * Public — the whole point is the caller is logged out and can't prove
   * who they are yet. Never resets anything itself, and always returns the
   * same message regardless of whether `identifier` matched a real
   * account, so this can't be used to enumerate valid usernames. Skips
   * creating a duplicate if a PENDING request for this user already
   * exists, so one person spamming the button doesn't flood HR's queue.
   */
  async requestPasswordReset(identifier: string) {
    const user = identifier
      ? await this.prisma.user.findFirst({ where: { OR: [{ email: identifier }, { username: identifier }] } })
      : null;

    if (user) {
      const existing = await this.prisma.passwordResetRequest.findFirst({
        where: { userId: user.id, status: 'PENDING' },
      });
      if (!existing) {
        await this.prisma.passwordResetRequest.create({ data: { userId: user.id } });
      }
    }

    return { message: 'If that account exists, HR/Admin has been notified to reset the password.' };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: { include: { permissions: true } },
        employee: { include: { department: true, designation: true } },
      },
    });
    if (!user) throw new UnauthorizedException('User not found');
    return user;
  }


  async getSessions(userId: string) {
    return this.prisma.authentication.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
  }

  async revokeSession(userId: string, sessionId: string) {
    await this.prisma.authentication.updateMany({
      where: { id: sessionId, userId },
      data: { isActive: false },
    });
    return { message: 'Session revoked successfully' };
  }

  async validateToken(token: string) {
    try {
      const payload = this.jwtService.verify(token);
      return payload;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
