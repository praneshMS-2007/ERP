import { Controller, Get, Post, Delete, Body, Param } from '@nestjs/common';
import { AnnouncementsService } from './announcements.service';
import { CurrentUser } from '../auth/decorators';
import type { AuthenticatedUser } from '../auth/permission.util';

/**
 * No @RequirePermission anywhere here — every route only needs a valid JWT
 * (the global guards already enforce that). The real "management accounts
 * only" gate for creating/deleting lives inside the service, same
 * wide-open-gate-narrow-check-inside pattern as the SELF module, since this
 * cuts across every role rather than belonging to one module.
 */
@Controller('announcements')
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Get()
  getAnnouncements(@CurrentUser() user: AuthenticatedUser) {
    return this.announcementsService.getAnnouncements(user);
  }

  @Get('recipients')
  getRecipientOptions() {
    return this.announcementsService.getRecipientOptions();
  }

  @Post()
  createAnnouncement(
    @Body() body: { title: string; body: string; fileUrl?: string; fileName?: string; isBroadcast: boolean; recipientUserIds?: string[] },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.announcementsService.createAnnouncement(body, user);
  }

  @Delete(':id')
  deleteAnnouncement(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.announcementsService.deleteAnnouncement(id, user);
  }
}
