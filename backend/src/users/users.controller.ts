import { Controller, Get, Post, Body, Param, Put, Delete } from '@nestjs/common';
import { UsersService } from './users.service';
import { Prisma } from '@prisma/client';
import { RequirePermission } from '../auth/decorators';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermission('ADMIN', 'READ')
  getUsers() {
    return this.usersService.getUsers();
  }

  @Get('roles')
  @RequirePermission('ADMIN', 'READ')
  getRoles() {
    return this.usersService.getRoles();
  }

  @Get(':id')
  @RequirePermission('ADMIN', 'READ')
  getUserById(@Param('id') id: string) {
    return this.usersService.getUserById(id);
  }

  @Post()
  @RequirePermission('ADMIN', 'WRITE')
  createUser(@Body() data: Prisma.UserUncheckedCreateInput) {
    return this.usersService.createUser(data);
  }

  @Put(':id')
  @RequirePermission('ADMIN', 'WRITE')
  updateUser(
    @Param('id') id: string,
    @Body('email') email?: string,
    @Body('roleId') roleId?: string,
    @Body('password') password?: string,
  ) {
    return this.usersService.updateUser(id, email, roleId, password);
  }

  @Delete(':id')
  @RequirePermission('ADMIN', 'DELETE')
  deleteUser(@Param('id') id: string) {
    return this.usersService.deleteUser(id);
  }
}
