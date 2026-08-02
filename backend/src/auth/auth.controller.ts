import { Controller, Get, Post, Put, Delete, Body, Headers, Param, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './decorators';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  login(@Body() body: any) {
    return this.authService.login(body.email, body.password);
  }

  @Public()
  @Post('logout')
  logout(@Headers('authorization') authHeader: string) {
    const token = authHeader?.split(' ')[1];
    if (token) {
      return this.authService.logout(token);
    }
    return { message: 'Logged out' };
  }

  @Get('me')
  getProfile(@Request() req: any) {
    return this.authService.getProfile(req.user?.sub || req.user?.id);
  }

  @Put('profile')
  updateProfile(@Request() req: any, @Body() body: any) {
    return this.authService.updateProfile(req.user?.sub || req.user?.id, body);
  }

  @Put('change-password')
  changePassword(@Request() req: any, @Body() body: any) {
    return this.authService.changePassword(
      req.user?.sub || req.user?.id,
      body.currentPassword,
      body.newPassword
    );
  }

  @Get('sessions')
  getSessions(@Request() req: any) {
    return this.authService.getSessions(req.user?.sub || req.user?.id);
  }

  @Delete('sessions/:id')
  revokeSession(@Request() req: any, @Param('id') id: string) {
    return this.authService.revokeSession(req.user?.sub || req.user?.id, id);
  }
}
