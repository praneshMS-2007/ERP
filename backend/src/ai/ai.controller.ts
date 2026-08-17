import { Controller, Post, Body } from '@nestjs/common';
import { AiService } from './ai.service';
import { CurrentUser } from '../auth/decorators';
import type { AuthenticatedUser } from '../auth/permission.util';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  // No @RequirePermission here on purpose — every role is allowed to talk to
  // the assistant (it's in the sidebar for everyone). What each caller gets
  // back is scoped inside chatCompletion itself, per their own permissions,
  // not gated at the door.
  @Post('chat')
  async chat(@Body() body: { messages: any[] }, @CurrentUser() user: AuthenticatedUser) {
    return this.aiService.chatCompletion(body.messages, user);
  }
}
