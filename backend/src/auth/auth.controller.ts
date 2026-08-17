import { Controller, Get, Post, Put, Delete, Body, Headers, Param, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './decorators';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  login(@Body() body: any, @Request() req: any, @Headers('user-agent') userAgent: string) {
    return this.authService.login(body.email, body.password, req.ip, userAgent);
  }

  @Public()
  @Post('request-password-reset')
  requestPasswordReset(@Body('identifier') identifier: string) {
    return this.authService.requestPasswordReset(identifier);
  }

  @Public()
  @Post('logout')
  logout(@Headers('authorization') authHeader: string, @Request() req: any) {
    const token = authHeader?.split(' ')[1];
    if (token) {
      return this.authService.logout(token, req.ip);
    }
    return { message: 'Logged out' };
  }

  @Get('me')
  getProfile(@Request() req: any) {
    return this.authService.getProfile(req.user?.sub || req.user?.id);
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
