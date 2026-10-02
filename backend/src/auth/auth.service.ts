import { BadRequestException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
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

    // The session id is minted BEFORE signing, not after, so it can be
    // embedded in the token itself as `sid` — that's what
    // JwtStrategy.validate checks on every request, so "Revoke Session" (or
    // an admin deactivating someone) actually ends this exact token
    // immediately instead of only hiding it from the list while it keeps
    // working for the rest of its 24h life.
    const sessionId = randomUUID();
    const payload: JwtPayload = {
      sub: user.id,
      sid: sessionId,
      email: user.email,
      role: user.role.name,
      permissions,
    };

    const token = this.jwtService.sign(payload);

    // deviceInfo/ipAddress come straight from this request (User-Agent
    // header, req.ip), not placeholder text, so the Settings > Sessions list
    // reflects what actually signed in.
    await this.prisma.authentication.create({
      data: {
        id: sessionId,
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
        mustChangePassword: user.mustChangePassword,
        name: user.employee
          ? `${user.employee.firstName} ${user.employee.lastName}`
          : 'Admin User',
        avatarUrl: user.employee?.avatarUrl ?? null,
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

    // Settings > My Profile is read-only and never needs the password hash,
    // the encrypted password/PII ciphertext, or reset tokens — none of
    // which have any legitimate reason to reach the browser. Strip them
    // here rather than trusting every future caller of this method to.
    const { passwordHash, passwordPlain, resetToken, resetTokenExpiry, employee, ...safeUser } = user;
    if (!employee) return safeUser;

    const { pan, aadhaarNumber, bankAccountNo, bankIfsc, uanNumber, esicNumber, pfNumber, ...safeEmployee } = employee;
    return { ...safeUser, employee: safeEmployee };
  }


  /**
   * The one thing an account with a temporary password may do. Checks the
   * current password first (so a stolen session alone can't lock the owner
   * out), refuses a reuse of it, and clears the reversible copy that Admin/HR
   * could read in User Management — once someone has chosen their own
   * password, it is no longer something HR should be able to look up.
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');
    // Passwords are otherwise changed only by HR/Admin (see User Management);
    // this route exists solely for the first sign-in on a temporary password.
    if (!user.mustChangePassword) {
      throw new ForbiddenException('Your password is changed by HR or an administrator. Ask them to reset it.');
    }

    if (!currentPassword || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      // 400, not 401: a 401 makes the browser treat the session as expired and sign the person out.
      throw new BadRequestException('Your current password is not correct.');
    }
    const next = newPassword ?? '';
    if (next.length < 8) throw new BadRequestException('The new password must be at least 8 characters long.');
    if (!/[A-Za-z]/.test(next) || !/[0-9]/.test(next)) {
      throw new BadRequestException('The new password must contain at least one letter and one number.');
    }
    if (next === currentPassword) throw new BadRequestException('Choose a password different from your current one.');
    const handle = (user.username || user.email?.split('@')[0] || '').toLowerCase();
    if (handle && next.toLowerCase().includes(handle)) {
      throw new BadRequestException('The password should not contain your username.');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await bcrypt.hash(next, 10), passwordPlain: null, mustChangePassword: false },
    });
    this.audit.log({ userId, action: 'CHANGE_PASSWORD', module: 'ADMIN' });
    return { message: 'Password updated.' };
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
