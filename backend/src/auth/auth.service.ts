import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  async login(email: string, passwordPlain: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { role: true, employee: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(passwordPlain, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // In a production app, we would generate a real JWT here.
    // For this rewrite phase, we'll return a dummy token so the frontend works.
    const token = Buffer.from(JSON.stringify({ id: user.id, role: user.role.name })).toString('base64');

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
        name: user.employee ? `${user.employee.firstName} ${user.employee.lastName}` : 'Admin User'
      }
    };
  }

  async logout(token: string) {
    await this.prisma.authentication.updateMany({
      where: { token },
      data: { isActive: false },
    });
    return { message: 'Logged out successfully' };
  }
}
