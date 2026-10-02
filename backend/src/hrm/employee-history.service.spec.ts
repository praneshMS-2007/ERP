import { EmployeeHistoryService, TrackedSnapshot } from './employee-history.service';

const base = (over: Partial<TrackedSnapshot> = {}): TrackedSnapshot => ({
  empType: 'INTERN',
  status: 'ACTIVE',
  workMode: 'REMOTE',
  hasStipend: true,
  stipendAmount: 8000,
  joinDate: new Date('2026-06-01T00:00:00Z'),
  engagementEndDate: new Date('2026-09-01T00:00:00Z'),
  designation: { title: 'Backend Intern' },
  department: { name: 'Engineering' },
  reportingManager: null,
  ...over,
});

describe('EmployeeHistoryService.diff', () => {
  const svc = new EmployeeHistoryService(null as any);

  it('reports nothing when no tracked field moved', () => {
    expect(svc.diff(base(), base())).toEqual([]);
  });

  it('reports a role conversion with readable before/after values', () => {
    const changes = svc.diff(base(), base({ empType: 'FULL_TIME', designation: { title: 'Backend Developer' } }));
    expect(changes).toEqual([
      { field: 'empType', label: 'Employment type', from: 'Intern', to: 'Full Time' },
      { field: 'designation', label: 'Designation', from: 'Backend Intern', to: 'Backend Developer' },
    ]);
  });

  it('marks pay changes sensitive and words unpaid roles as "Unpaid"', () => {
    const [pay] = svc.diff(base(), base({ hasStipend: false, stipendAmount: null }));
    expect(pay).toMatchObject({ field: 'compensation', from: '₹8,000/month', to: 'Unpaid', sensitive: true });
  });

  it('treats a stipend flag with no amount as unpaid, not as ₹0', () => {
    expect(svc.diff(base({ hasStipend: true, stipendAmount: null }), base({ hasStipend: false, stipendAmount: null }))).toEqual([]);
  });
});

describe('EmployeeHistoryService.recordEdit', () => {
  const events: any[] = [];
  const db: any = {
    employeeEvent: { create: async ({ data }: any) => { events.push(data); return data; } },
    user: { findUnique: async () => ({ username: 'hr.user', email: null, employee: null }) },
  };
  const svc = new EmployeeHistoryService(null as any);
  beforeEach(() => { events.length = 0; });

  it('writes nothing for an edit that changed no tracked field', async () => {
    expect(await svc.recordEdit('e1', [], { id: 'u1' } as any, db)).toBeNull();
    expect(events).toHaveLength(0);
  });

  it('files a multi-field edit under the most significant change and counts the rest', async () => {
    const changes = svc.diff(base(), base({ workMode: 'HYBRID', empType: 'PART_TIME' }));
    await svc.recordEdit('e1', changes, { id: 'u1' } as any, db);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('EMPLOYMENT_TYPE_CHANGED');
    expect(events[0].title).toBe('Employment type: Intern → Part Time (+1 more)');
    expect(events[0].actorName).toBe('hr.user');
  });

  it('keeps pay amounts out of the title of a pay-only edit', async () => {
    const changes = svc.diff(base(), base({ stipendAmount: 20000 }));
    await svc.recordEdit('e1', changes, { id: 'u1' } as any, db);
    expect(events[0].type).toBe('COMPENSATION_CHANGED');
    expect(events[0].title).toBe('Monthly pay updated');
  });
});
