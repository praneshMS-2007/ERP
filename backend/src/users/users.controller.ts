import { Controller, Get, Post, Body, Param, Put, Delete } from '@nestjs/common';
import { UsersService } from './users.service';
import { Prisma } from '@prisma/client';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  getUsers() {
    return this.usersService.getUsers();
  }

  @Get('roles')
  getRoles() {
    return this.usersService.getRoles();
  }

  @Get(':id')
  getUserById(@Param('id') id: string) {
    return this.usersService.getUserById(id);
  }

  @Post()
  createUser(@Body() data: Prisma.UserUncheckedCreateInput) {
    return this.usersService.createUser(data);
  }

  @Put(':id')
  updateUser(
    @Param('id') id: string,
    @Body('email') email?: string,
    @Body('roleId') roleId?: string,
    @Body('password') password?: string,
  ) {
    return this.usersService.updateUser(id, email, roleId, password);
  }

  @Delete(':id')
  deleteUser(@Param('id') id: string) {
    return this.usersService.deleteUser(id);
  }
}
