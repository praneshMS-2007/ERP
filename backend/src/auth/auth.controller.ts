import { Controller, Post, Body, Headers } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() body: any) {
    return this.authService.login(body.email, body.password);
  }

  @Post('logout')
  logout(@Headers('authorization') authHeader: string) {
    const token = authHeader?.split(' ')[1];
    if (token) {
      return this.authService.logout(token);
    }
    return { message: 'Logged out' };
  }
}
