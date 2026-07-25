import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getUsers() {
    const users = await this.prisma.user.findMany({
      include: { role: true, employee: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return users.map((u) => ({
      id: u.id,
      email: u.email,
      role: u.role.name,
      employee: u.employee,
      createdAt: u.createdAt,
    }));
  }

  async getUserById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { role: true, employee: { include: { department: true, designation: true } } },
    });
    if (!user) throw new NotFoundException('User not found');
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      employee: user.employee,
      createdAt: user.createdAt,
    };
  }

  async createUser(data: Prisma.UserUncheckedCreateInput) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.passwordHash, salt);
    return this.prisma.user.create({
      data: { ...data, passwordHash },
      select: { id: true, email: true, roleId: true, createdAt: true },
    });
  }

  async updateUser(id: string, email?: string, roleId?: string, password?: string) {
    const data: any = {};
    if (email) data.email = email;
    if (roleId) data.roleId = roleId;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      data.passwordHash = await bcrypt.hash(password, salt);
    }

    const user = await this.prisma.user.update({
      where: { id },
      data,
      include: { role: true },
    });
    return { message: 'User updated', user: { id: user.id, email: user.email, role: user.role.name } };
  }

  async deleteUser(id: string) {
    // Delete related sessions first
    await this.prisma.authentication.deleteMany({ where: { userId: id } });
    await this.prisma.user.delete({ where: { id } });
    return { message: 'User deleted' };
  }

  async getRoles() {
    return this.prisma.role.findMany({ include: { permissions: true } });
  }
}
