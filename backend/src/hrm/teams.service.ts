import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TeamRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmployeeHistoryService } from './employee-history.service';
import type { RequestUser } from './hrm.service';

/** Who may see teams and enter monthly revenue (Finance enters revenue too). */
const VIEW_ROLES = new Set(['SUPER_ADMIN', 'HR_MANAGER', 'FINANCE_MANAGER']);
/** Who may create teams and change who is in them. */
const MANAGE_ROLES = new Set(['SUPER_ADMIN', 'HR_MANAGER']);

export interface MembershipInput {
  teamId?: string;
  employeeId?: string;
  role?: string;
  revenueSharePct?: number | string | null;
}

type Db = Prisma.TransactionClient | PrismaService;

interface Row { employeeId: string; role: TeamRole; revenueSharePct: number | null }

const pctLabel = (p: number | null) => (p ? `${+p.toFixed(2)}% revenue share` : 'no revenue share');
const roleLabel = (r: TeamRole) => (r === 'HEAD' ? 'Head' : 'Member');
const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

/**
 * Teams, who is in them (Head / Member, with an optional % of the team's
 * revenue), and each team's revenue per month. Payroll reads the last two to
 * work out a person's revenue share; see computeShare.
 *
 * A person may be in several teams. Each team has at most one Head, and its
 * members' shares can't add up to more than 100%.
 */
@Injectable()
export class TeamsService {
  constructor(private prisma: PrismaService, private history: EmployeeHistoryService) {}

  private assertView(viewer?: RequestUser) {
    if (!viewer || !VIEW_ROLES.has(viewer.role)) throw new ForbiddenException('Only HR, Finance and administrators can see teams.');
  }
  private assertManage(viewer?: RequestUser) {
    if (!viewer || !MANAGE_ROLES.has(viewer.role)) throw new ForbiddenException('Only HR and administrators can change teams.');
  }

  // ===================== teams =====================

  async list(viewer?: RequestUser) {
    this.assertView(viewer);
    const teams = await this.prisma.team.findMany({
      include: {
        members: {
          include: { employee: { select: { id: true, firstName: true, lastName: true, empCode: true, status: true, empType: true, payType: true, designation: { select: { title: true } } } } },
          orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
        },
      },
      orderBy: { name: 'asc' },
    });
    return teams.map((t) => ({
      ...t,
      members: t.members.filter((m) => m.employee.status !== 'INACTIVE'),
      totalSharePct: +t.members.filter((m) => m.employee.status !== 'INACTIVE').reduce((s, m) => s + (m.revenueSharePct ?? 0), 0).toFixed(2),
    }));
  }

  async create(body: { name?: string; description?: string }, viewer?: RequestUser) {
    this.assertManage(viewer);
    const name = this.cleanName(body.name);
    await this.assertNameFree(name);
    return this.prisma.team.create({ data: { name, description: body.description?.trim() || null } });
  }

  async update(id: string, body: { name?: string; description?: string; isActive?: boolean }, viewer?: RequestUser) {
    this.assertManage(viewer);
    const team = await this.prisma.team.findUnique({ where: { id } });
    if (!team) throw new NotFoundException('Team not found');
    const data: Prisma.TeamUpdateInput = {};
    if (body.name !== undefined) {
      data.name = this.cleanName(body.name);
      if (data.name.toLowerCase() !== team.name.toLowerCase()) await this.assertNameFree(data.name);
    }
    if (body.description !== undefined) data.description = body.description?.trim() || null;
    if (body.isActive !== undefined) data.isActive = !!body.isActive;
    return this.prisma.team.update({ where: { id }, data });
  }

  async remove(id: string, viewer?: RequestUser) {
    this.assertManage(viewer);
    const team = await this.prisma.team.findUnique({ where: { id }, include: { members: true } });
    if (!team) throw new NotFoundException('Team not found');
    await this.prisma.$transaction(async (tx) => {
      for (const m of team.members) {
        await this.history.record({
          employeeId: m.employeeId, type: 'TEAM_CHANGED', title: `Left ${team.name} (team deleted)`,
          changes: [{ field: 'team', label: team.name, from: `${roleLabel(m.role)} · ${pctLabel(m.revenueSharePct)}`, to: null }], actor: viewer,
        }, tx);
      }
      await tx.team.delete({ where: { id } });
      for (const m of team.members) await this.syncPayType(m.employeeId, tx);
    });
    return { message: `${team.name} deleted.` };
  }

  private cleanName(raw?: string) {
    const name = (raw ?? '').trim().replace(/\s+/g, ' ');
    if (!name) throw new BadRequestException('Team name is required.');
    if (name.length > 80) throw new BadRequestException('Team name is too long.');
    return name;
  }

  private async assertNameFree(name: string) {
    const clash = await this.prisma.team.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } });
    if (clash) throw new BadRequestException(`A team called "${clash.name}" already exists.`);
  }

  // ===================== membership =====================

  /** Replace a team's whole member list (the Teams page). */
  async setTeamMembers(teamId: string, input: MembershipInput[], viewer?: RequestUser) {
    this.assertManage(viewer);
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!team) throw new NotFoundException('Team not found');
    const rows = this.parseRows((input ?? []).map((r) => ({ ...r, teamId })), 'employeeId');
    await this.assertEmployeesActive(rows.map((r) => r.employeeId));
    this.validateTeam(team.name, rows);
    await this.prisma.$transaction((tx) => this.applyTeam(tx, team, rows, viewer));
    return (await this.list(viewer)).find((t) => t.id === teamId);
  }

  /** One person's teams (the employee screens). */
  async getEmployeeTeams(employeeId: string) {
    return this.prisma.teamMember.findMany({
      where: { employeeId },
      include: { team: { select: { id: true, name: true, isActive: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Checks a person's new team list against every affected team, without
   * saving — so Add Employee can refuse bad shares before creating anyone.
   */
  async validateEmployeeTeams(employeeId: string | null, input: MembershipInput[]) {
    const wanted = this.parseRows((input ?? []).map((r) => ({ ...r, employeeId: employeeId ?? '__new__' })), 'teamId') as unknown as (Row & { teamId: string })[];
    const teamIds = Array.from(new Set(wanted.map((w) => w.teamId)));
    // Former employees' old rows don't count towards a team's Head or 100% limits.
    const membersInclude = { members: { include: { employee: { select: { status: true } } } } } as const;
    const teams = await this.prisma.team.findMany({ where: { id: { in: teamIds } }, include: membersInclude });
    const touched = new Set([...teamIds, ...(employeeId ? (await this.prisma.teamMember.findMany({ where: { employeeId }, select: { teamId: true } })).map((m) => m.teamId) : [])]);
    const plans: { team: { id: string; name: string }; rows: Row[] }[] = [];
    for (const teamId of touched) {
      const team = teams.find((t) => t.id === teamId) ?? (await this.prisma.team.findUnique({ where: { id: teamId }, include: membersInclude }));
      if (!team) throw new BadRequestException('One of the chosen teams no longer exists.');
      const others: Row[] = team.members.filter((m) => m.employeeId !== employeeId && m.employee.status !== 'INACTIVE').map((m) => ({ employeeId: m.employeeId, role: m.role, revenueSharePct: m.revenueSharePct }));
      const mine = wanted.find((w) => w.teamId === teamId);
      const rows = mine ? [...others, { employeeId: mine.employeeId, role: mine.role, revenueSharePct: mine.revenueSharePct }] : others;
      this.validateTeam(team.name, rows);
      plans.push({ team, rows });
    }
    return plans;
  }

  /** Replace one person's team list. Runs inside the caller's transaction when given one. */
  async setEmployeeTeams(employeeId: string, input: MembershipInput[], viewer?: RequestUser, db?: Prisma.TransactionClient) {
    const plans = await this.validateEmployeeTeams(employeeId, input);
    const run = async (tx: Prisma.TransactionClient) => {
      for (const p of plans) await this.applyTeam(tx, p.team, p.rows, viewer, employeeId);
      await this.syncPayType(employeeId, tx);
    };
    if (db) await run(db); else await this.prisma.$transaction(run);
  }

  private parseRows(input: MembershipInput[], key: 'employeeId' | 'teamId'): Row[] {
    const seen = new Set<string>();
    return input.map((r) => {
      const id = String((r as any)[key] ?? '').trim();
      if (!id) throw new BadRequestException(key === 'teamId' ? 'Choose a team for every row.' : 'Choose a person for every row.');
      if (seen.has(id)) throw new BadRequestException(key === 'teamId' ? 'The same team is listed twice.' : 'The same person is listed twice.');
      seen.add(id);
      const role = String(r.role ?? 'MEMBER').toUpperCase();
      if (role !== 'HEAD' && role !== 'MEMBER') throw new BadRequestException('Position must be Head or Member.');
      let pct: number | null = null;
      if (r.revenueSharePct !== null && r.revenueSharePct !== undefined && String(r.revenueSharePct).trim() !== '') {
        pct = Number(r.revenueSharePct);
        if (!Number.isFinite(pct) || pct < 0 || pct > 100) throw new BadRequestException('Revenue share must be a percentage between 0 and 100.');
        pct = Math.round(pct * 100) / 100;
        if (pct === 0) pct = null;
      }
      return { employeeId: key === 'employeeId' ? id : String(r.employeeId), teamId: key === 'teamId' ? id : String(r.teamId), role: role as TeamRole, revenueSharePct: pct } as Row & { teamId: string };
    });
  }

  private validateTeam(teamName: string, rows: Row[]) {
    if (rows.filter((r) => r.role === 'HEAD').length > 1) {
      throw new BadRequestException(`${teamName} can have only one Head.`);
    }
    const total = rows.reduce((s, r) => s + (r.revenueSharePct ?? 0), 0);
    if (total > 100.0001) {
      throw new BadRequestException(`${teamName}'s revenue shares would add up to ${+total.toFixed(2)}% — the total can't be more than 100%.`);
    }
  }

  private async assertEmployeesActive(ids: string[]) {
    if (!ids.length) return;
    const found = await this.prisma.employee.findMany({ where: { id: { in: ids } }, select: { id: true, status: true, firstName: true } });
    if (found.length !== ids.length) throw new BadRequestException('One of the chosen people no longer exists.');
    const former = found.find((e) => e.status === 'INACTIVE');
    if (former) throw new BadRequestException(`${former.firstName} is a former employee and can't be added to a team.`);
  }

  /** Write a team's member list, recording each person's change on their history. */
  private async applyTeam(tx: Prisma.TransactionClient, team: { id: string; name: string }, rows: Row[], viewer?: RequestUser, onlyEmployeeId?: string) {
    const current = await tx.teamMember.findMany({ where: { teamId: team.id } });
    const changed = new Set<string>();
    for (const c of current) {
      if (onlyEmployeeId && c.employeeId !== onlyEmployeeId) continue;
      const next = rows.find((r) => r.employeeId === c.employeeId);
      if (!next) {
        await tx.teamMember.delete({ where: { id: c.id } });
        await this.history.record({ employeeId: c.employeeId, type: 'TEAM_CHANGED', title: `Left ${team.name}`,
          changes: [{ field: 'team', label: team.name, from: `${roleLabel(c.role)} · ${pctLabel(c.revenueSharePct)}`, to: null }], actor: viewer }, tx);
        changed.add(c.employeeId);
      } else if (next.role !== c.role || (next.revenueSharePct ?? null) !== (c.revenueSharePct ?? null)) {
        await tx.teamMember.update({ where: { id: c.id }, data: { role: next.role, revenueSharePct: next.revenueSharePct } });
        await this.history.record({ employeeId: c.employeeId, type: 'TEAM_CHANGED', title: `${team.name}: position or share changed`,
          changes: [{ field: 'team', label: team.name, from: `${roleLabel(c.role)} · ${pctLabel(c.revenueSharePct)}`, to: `${roleLabel(next.role)} · ${pctLabel(next.revenueSharePct)}`, sensitive: true }], actor: viewer }, tx);
        changed.add(c.employeeId);
      }
    }
    for (const r of rows) {
      if (onlyEmployeeId && r.employeeId !== onlyEmployeeId) continue;
      if (current.some((c) => c.employeeId === r.employeeId)) continue;
      await tx.teamMember.create({ data: { teamId: team.id, employeeId: r.employeeId, role: r.role, revenueSharePct: r.revenueSharePct } });
      await this.history.record({ employeeId: r.employeeId, type: 'TEAM_CHANGED', title: `Joined ${team.name} as ${roleLabel(r.role)}`,
        changes: [{ field: 'team', label: team.name, from: null, to: `${roleLabel(r.role)} · ${pctLabel(r.revenueSharePct)}`, sensitive: true }], actor: viewer }, tx);
      changed.add(r.employeeId);
    }
    if (!onlyEmployeeId) for (const id of changed) await this.syncPayType(id, tx);
  }

  /**
   * Pay type always follows the facts, so it can never disagree with them:
   * a fixed amount on file and/or a revenue share in any active team.
   */
  async syncPayType(employeeId: string, db: Db = this.prisma) {
    const emp = await db.employee.findUnique({ where: { id: employeeId }, select: { hasStipend: true, stipendAmount: true, payType: true } });
    if (!emp) return;
    const share = (await db.teamMember.count({ where: { employeeId, revenueSharePct: { gt: 0 }, team: { isActive: true } } })) > 0;
    const fixed = !!emp.hasStipend && (emp.stipendAmount ?? 0) > 0;
    const payType = share && fixed ? 'FIXED_AND_SHARE' : share ? 'REVENUE_SHARE' : 'FIXED';
    if (payType !== emp.payType) await db.employee.update({ where: { id: employeeId }, data: { payType } });
  }

  // ===================== monthly revenue =====================

  private cleanPeriod(raw?: string) {
    const p = String(raw ?? '').trim();
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(p)) throw new BadRequestException('Choose a month (YYYY-MM).');
    return p;
  }

  async getRevenue(periodRaw: string, viewer?: RequestUser) {
    this.assertView(viewer);
    const period = this.cleanPeriod(periodRaw);
    const [teams, entries] = await Promise.all([
      this.prisma.team.findMany({ where: { isActive: true }, orderBy: { name: 'asc' }, include: { members: { where: { revenueSharePct: { gt: 0 }, employee: { status: { not: 'INACTIVE' } } }, select: { revenueSharePct: true } } } }),
      this.prisma.teamRevenue.findMany({ where: { period } }),
    ]);
    return {
      period,
      teams: teams.map((t) => {
        const e = entries.find((x) => x.teamId === t.id);
        return {
          teamId: t.id, name: t.name,
          amount: e?.amount ?? null, note: e?.note ?? null,
          enteredByName: e?.enteredByName ?? null, updatedAt: e?.updatedAt ?? null,
          sharedPct: +t.members.reduce((s, m) => s + (m.revenueSharePct ?? 0), 0).toFixed(2),
        };
      }),
    };
  }

  async setRevenue(periodRaw: string, input: { teamId: string; amount: number | string | null; note?: string }[], viewer?: RequestUser) {
    this.assertView(viewer);
    const period = this.cleanPeriod(periodRaw);
    const actor = viewer ? await this.prisma.user.findUnique({ where: { id: viewer.id }, select: { username: true, email: true, employee: { select: { firstName: true, lastName: true } } } }) : null;
    const actorName = actor ? (actor.employee ? `${actor.employee.firstName} ${actor.employee.lastName}`.trim() : actor.username || actor.email) : null;
    // Paid payroll keeps its own snapshot, but say so if the month was already paid out.
    await this.prisma.$transaction(async (tx) => {
      for (const row of input ?? []) {
        if (!row?.teamId) continue;
        const blank = row.amount === null || row.amount === undefined || String(row.amount).trim() === '';
        if (blank) { await tx.teamRevenue.deleteMany({ where: { teamId: row.teamId, period } }); continue; }
        const amount = Number(row.amount);
        if (!Number.isFinite(amount) || amount < 0) throw new BadRequestException('Revenue must be a number of zero or more.');
        await tx.teamRevenue.upsert({
          where: { teamId_period: { teamId: row.teamId, period } },
          update: { amount, note: row.note?.trim() || null, enteredById: viewer?.id ?? null, enteredByName: actorName },
          create: { teamId: row.teamId, period, amount, note: row.note?.trim() || null, enteredById: viewer?.id ?? null, enteredByName: actorName },
        });
      }
    });
    return this.getRevenue(period, viewer);
  }

  // ===================== payroll =====================

  /**
   * A person's revenue share for the month a payroll period starts in:
   * share % x that team's entered revenue, per team. `missing` lists teams
   * whose revenue hasn't been entered for that month yet.
   */
  async computeShare(employeeId: string, periodStart: Date) {
    const period = `${periodStart.getFullYear()}-${String(periodStart.getMonth() + 1).padStart(2, '0')}`;
    const memberships = await this.prisma.teamMember.findMany({
      where: { employeeId, revenueSharePct: { gt: 0 }, team: { isActive: true } },
      include: { team: { select: { id: true, name: true } } },
    });
    if (!memberships.length) return { period, total: 0, lines: [] as any[], missing: [] as string[] };
    const revenues = await this.prisma.teamRevenue.findMany({ where: { period, teamId: { in: memberships.map((m) => m.teamId) } } });
    const lines: { teamId: string; teamName: string; role: TeamRole; pct: number; revenue: number; amount: number }[] = [];
    const missing: string[] = [];
    for (const m of memberships) {
      const rev = revenues.find((r) => r.teamId === m.teamId);
      if (!rev) { missing.push(m.team.name); continue; }
      const amount = Math.round(rev.amount * (m.revenueSharePct! / 100) * 100) / 100;
      lines.push({ teamId: m.teamId, teamName: m.team.name, role: m.role, pct: m.revenueSharePct!, revenue: rev.amount, amount });
    }
    const total = Math.round(lines.reduce((s, l) => s + l.amount, 0) * 100) / 100;
    return { period, total, lines, missing };
  }

  /** Readable terms for letters, e.g. "50% of the revenue generated by the Sunrisers team". */
  async shareTerms(employeeId: string): Promise<string[]> {
    const ms = await this.prisma.teamMember.findMany({
      where: { employeeId, revenueSharePct: { gt: 0 }, team: { isActive: true } },
      include: { team: { select: { name: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return ms.map((m) => `${+m.revenueSharePct!.toFixed(2)}% of the revenue generated by the ${m.team.name} team`);
  }

  static formatInr = inr;
}
