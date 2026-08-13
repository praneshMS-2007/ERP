import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { JwtPayload } from './jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  /**
   * `identifier` is either an email (the original demo accounts) or a
   * generated username (ERP-provisioned employee accounts have no mailbox
   * yet — see credentials.ts). Both live in unique columns, so one lookup
   * covers both without ambiguity.
   */
  async login(identifier: string, passwordPlain: string) {
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

    // Store the session
    await this.prisma.authentication.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24 hours
      },
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role.name,
        permissions,
        name: user.employee
          ? `${user.employee.firstName} ${user.employee.lastName}`
          : 'Admin User',
      },
    };
  }

  async logout(token: string) {
    await this.prisma.authentication.updateMany({
      where: { token },
      data: { isActive: false },
    });
    return { message: 'Logged out successfully' };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: { include: { permissions: true } },
        employee: true,
      },
    });
    if (!user) throw new UnauthorizedException('User not found');
    return user;
  }

  async updateProfile(userId: string, data: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { employee: true },
    });
    if (!user) throw new UnauthorizedException('User not found');

    if (user.employee) {
      await this.prisma.employee.update({
        where: { id: user.employee.id },
        data: {
          firstName: data.firstName || user.employee.firstName,
          lastName: data.lastName || user.employee.lastName,
          contact: data.phone || user.employee.contact,
          address: data.address || user.employee.address,
          country: data.country || user.employee.country,
          city: data.city || user.employee.city,
        },
      });
    }

    return { message: 'Profile updated successfully' };
  }

  async changePassword(userId: string, currentPass: string, newPass: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');

    const isMatch = await bcrypt.compare(currentPass, user.passwordHash);
    if (!isMatch) throw new UnauthorizedException('Current password does not match');

    const passwordHash = await bcrypt.hash(newPass, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { message: 'Password updated successfully' };
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
