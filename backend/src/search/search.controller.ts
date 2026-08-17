import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';
import { CurrentUser } from '../auth/decorators';
import type { AuthenticatedUser } from '../auth/permission.util';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  // No @RequirePermission — search itself is open to any authenticated
  // user (like the AI assistant), but every category inside it is filtered
  // per-caller in the service, not just fetched and trusted to be safe.
  @Get()
  async search(@Query('q') query: string, @CurrentUser() user: AuthenticatedUser) {
    return this.searchService.globalSearch(query, user);
  }
}
