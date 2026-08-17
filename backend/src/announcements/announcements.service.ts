import { Injectable, ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/permission.util';
import { NotificationService } from '../notification/notification.service';

/**
 * "Management account" = any role other than EMPLOYEE — confirmed by the
 * user's own examples (admin, hr, finance, inventory, crm all send;
 * employee only ever reads). Deliberately a role check, not a module
 * permission, since this cuts across every module rather than belonging
 * to one.
 */
function isManagementAccount(viewer?: AuthenticatedUser): boolean {
  return !!viewer && viewer.role !== 'EMPLOYEE';
}

const RECIPIENT_SELECT = {
  id: true,
  username: true,
  email: true,
  employee: { select: { firstName: true, lastName: true } },
};

@Injectable()
export class AnnouncementsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationService,
  ) {}

  /**
   * The actual write + notification fan-out, with no permission check —
   * used both by the real POST /announcements (createAnnouncement, below,
   * which does check) and by Holiday declaration's auto-broadcast (which
   * has already confirmed HR/Admin by the time it gets here).
   */
  private async createAnnouncementInternal(
    authorUserId: string,
    data: { title: string; body: string; fileUrl?: string; fileName?: string; isBroadcast: boolean; recipientUserIds?: string[] },
  ) {
    const announcement = await this.prisma.$transaction(async (tx) => {
      const created = await tx.announcement.create({
        data: {
          authorUserId,
          title: data.title.trim(),
          body: data.body.trim(),
          fileUrl: data.fileUrl,
          fileName: data.fileName,
          isBroadcast: data.isBroadcast,
        },
      });
      if (!data.isBroadcast && data.recipientUserIds?.length) {
        await tx.announcementRecipient.createMany({
          data: data.recipientUserIds.map((userId) => ({ announcementId: created.id, userId })),
          skipDuplicates: true,
        });
      }
      return created;
    });

    const recipientUserIds = data.isBroadcast
      ? (await this.prisma.user.findMany({ where: { isActive: true }, select: { id: true } })).map((u) => u.id)
      : data.recipientUserIds || [];

    for (const userId of recipientUserIds) {
      if (userId === authorUserId) continue;
      await this.notifications.createNotification({
        userId,
        title: 'New Announcement',
        message: data.title.trim(),
        type: 'INFO',
        link: '/announcements',
      });
    }

    return announcement;
  }

  async createAnnouncement(
    data: { title: string; body: string; fileUrl?: string; fileName?: string; isBroadcast: boolean; recipientUserIds?: string[] },
    viewer?: AuthenticatedUser,
  ) {
    if (!isManagementAccount(viewer)) {
      throw new ForbiddenException('Only a management account can send an announcement.');
    }
    if (!data.title?.trim()) throw new BadRequestException('A title is required.');
    if (!data.body?.trim()) throw new BadRequestException('A message is required.');
    if (!data.isBroadcast && (!data.recipientUserIds || data.recipientUserIds.length === 0)) {
      throw new BadRequestException('Select at least one recipient, or choose Everyone.');
    }
    return this.createAnnouncementInternal(viewer!.id, data);
  }

  /** Called by HR/Admin's Holiday declaration — the permission check
   * already happened there, this is a trusted internal call. */
  async createSystemBroadcast(authorUserId: string, title: string, body: string) {
    return this.createAnnouncementInternal(authorUserId, { title, body, isBroadcast: true });
  }

  /** Visible to everyone: any broadcast, anything sent to me, or anything
   * I authored myself (so a sender can verify what they sent). */
  async getAnnouncements(viewer?: AuthenticatedUser) {
    if (!viewer) throw new ForbiddenException('Not signed in.');
    return this.prisma.announcement.findMany({
      where: {
        OR: [
          { isBroadcast: true },
          { authorUserId: viewer.id },
          { recipients: { some: { userId: viewer.id } } },
        ],
      },
      include: {
        author: { select: RECIPIENT_SELECT },
        recipients: { include: { user: { select: RECIPIENT_SELECT } } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async deleteAnnouncement(id: string, viewer?: AuthenticatedUser) {
    const announcement = await this.prisma.announcement.findUnique({ where: { id } });
    if (!announcement) throw new NotFoundException('Announcement not found');
    if (announcement.authorUserId !== viewer?.id && viewer?.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only the author or a Super Admin can delete this announcement.');
    }
    await this.prisma.announcementRecipient.deleteMany({ where: { announcementId: id } });
    await this.prisma.announcement.delete({ where: { id } });
    return { message: 'Announcement deleted' };
  }

  /** Every account, for the "Specific People" recipient picker — excludes
   * nobody by role, since even an EMPLOYEE can be a targeted recipient. */
  async getRecipientOptions() {
    return this.prisma.user.findMany({
      where: { isActive: true },
      select: RECIPIENT_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }
}
