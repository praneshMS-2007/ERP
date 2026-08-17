/**
 * The Employee Directory's detail view (Personal / Background / Statutory &
 * Bank / Nominee sections) was mostly blank for every seeded employee except
 * Rohan Verma — gender, DOB, address, emergency contact, education,
 * previous employment, PAN/Aadhaar/bank/UAN/PF/ESIC, nominee, and tax regime
 * were all null. That's also why Settings > My Profile (which now reads
 * straight from this same Employee record, read-only) showed empty boxes.
 *
 * This is a one-time demo-data backfill: fills only the fields that are
 * currently NULL/empty, per employee, with plausible mock values. Anything
 * already set (e.g. Rohan's real-looking data, or a contact number some
 * employees already had) is left untouched — this never overwrites existing
 * data. PAN/Aadhaar/UAN/PF/ESIC go through the same normalise + encryptField
 * path hrm.service.ts's updateEmployee uses, so they decrypt correctly
 * through the normal HR/Admin-gated view.
 *
 * Run with: npx ts-node scripts/fill-employee-mock-details.ts
 */
import { PrismaClient } from '@prisma/client';
import { normalisePan, normaliseAadhaar, normaliseUan, normaliseEsic, normaliseBankAccount, normaliseIfsc, normaliseEmail } from '../src/common/validators';
import { encryptField } from '../src/common/field-encryption';

const prisma = new PrismaClient();

const GENDERS = ['Male', 'Female'];
const CITIES: { city: string; state: string }[] = [
  { city: 'Bengaluru', state: 'Karnataka' },
  { city: 'Mumbai', state: 'Maharashtra' },
  { city: 'Chennai', state: 'Tamil Nadu' },
  { city: 'Hyderabad', state: 'Telangana' },
  { city: 'Pune', state: 'Maharashtra' },
  { city: 'Delhi', state: 'Delhi' },
  { city: 'Kochi', state: 'Kerala' },
  { city: 'Ahmedabad', state: 'Gujarat' },
];
const STREETS = ['MG Road', 'Park Street', 'Brigade Road', 'Anna Salai', 'Linking Road', 'Camac Street', 'FC Road', 'Marine Drive'];
const QUALIFICATIONS = ['B.Tech CSE', 'B.Sc Computer Science', 'MBA', 'M.Tech IT', 'B.Com', 'BBA', 'B.E Mechanical', 'MCA'];
const INSTITUTIONS = ['NIT Warangal', 'Anna University', 'Delhi University', 'VIT Vellore', 'Pune University', 'BITS Pilani', 'IIT Roorkee', 'Osmania University'];
const PREV_COMPANIES = ['TCS', 'Infosys', 'Wipro', 'Accenture', 'Capgemini', 'Cognizant', 'HCL Technologies', 'Tech Mahindra'];
const PREV_DESIGNATIONS = ['Associate Engineer', 'Software Engineer', 'Senior Analyst', 'Systems Engineer', 'Business Analyst', 'Consultant'];
const RELATIONS = ['Father', 'Mother', 'Spouse', 'Sibling'];
const FIRST_NAMES = ['Ravi', 'Anita', 'Suresh', 'Kavya', 'Deepak', 'Meera', 'Vikram', 'Pooja'];
const LAST_NAMES = ['Kumar', 'Menon', 'Reddy', 'Nair', 'Gupta', 'Rao', 'Iyer', 'Shah'];

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}

function randomDigits(n: number, seed: number): string {
  let s = '';
  let x = seed * 2654435761 % 2 ** 32;
  for (let i = 0; i < n; i++) {
    x = (x * 1103515245 + 12345) % 2 ** 32;
    s += Math.abs(x) % 10;
  }
  return s;
}

async function main() {
  const employees = await prisma.employee.findMany({ orderBy: { joinDate: 'asc' } });
  let updated = 0;

  for (let i = 0; i < employees.length; i++) {
    const e = employees[i];
    const seed = i + 1;
    const location = pick(CITIES, seed);
    const data: any = {};

    if (!e.gender) data.gender = pick(GENDERS, seed);
    if (!e.dob) {
      const age = 24 + (seed % 20); // 24-43
      data.dob = new Date(2026 - age, seed % 12, 1 + (seed * 3) % 28);
    }
    if (!e.contact) data.contact = `+91 ${90000 + seed * 137} ${10000 + seed * 211}`;
    if (!e.personalEmail) {
      const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
      data.personalEmail = normaliseEmail(`${slug(e.firstName)}.${slug(e.lastName)}.mock@example.com`);
    }
    if (!e.address) data.address = `${10 + seed} ${pick(STREETS, seed)}, ${location.city}`;
    if (!e.city) data.city = location.city;
    if (!e.state) data.state = location.state;
    if (!e.country) data.country = 'India';

    if (!e.emergencyContactName) data.emergencyContactName = `${pick(FIRST_NAMES, seed + 3)} ${pick(LAST_NAMES, seed + 5)}`;
    if (!e.emergencyContactPhone) data.emergencyContactPhone = `+91 ${98000 + seed * 91} ${20000 + seed * 173}`;
    if (!e.emergencyContactRelation) data.emergencyContactRelation = pick(RELATIONS, seed);

    if (!e.highestQualification) data.highestQualification = pick(QUALIFICATIONS, seed);
    if (!e.institutionName) data.institutionName = pick(INSTITUTIONS, seed);
    if (!e.yearOfPassing) {
      const dobYear = (data.dob ?? e.dob)?.getFullYear?.() ?? 2000;
      data.yearOfPassing = dobYear + 22;
    }

    if (!e.previousCompany) data.previousCompany = pick(PREV_COMPANIES, seed);
    if (!e.previousDesignation) data.previousDesignation = pick(PREV_DESIGNATIONS, seed);
    if (e.totalExperienceYears == null) data.totalExperienceYears = 1 + (seed % 8) + (seed % 3) * 0.5;

    if (!e.nomineeName) data.nomineeName = `${pick(FIRST_NAMES, seed + 1)} ${pick(LAST_NAMES, seed + 2)}`;
    if (!e.nomineeRelation) data.nomineeRelation = pick(RELATIONS, seed + 1);
    if (!e.nomineeDob) data.nomineeDob = new Date(1960 + (seed % 30), seed % 12, 1 + (seed * 5) % 28);
    if (!e.nomineePhone) data.nomineePhone = `+91 ${97000 + seed * 119} ${30000 + seed * 149}`;

    if (!e.taxRegime) data.taxRegime = seed % 2 === 0 ? 'NEW' : 'OLD';
    if (!e.taxDeclarationNotes) data.taxDeclarationNotes = 'Standard deduction applicable. No additional declarations on file.';

    // Statutory identifiers — encrypted at rest, same as updateEmployee().
    // Digits are deterministically generated from the row's position, not
    // real IDs, and are obviously synthetic (e.g. every ESIC starts 10 for
    // this batch) rather than resembling a real person's number.
    if (!e.pan) {
      const letters5 = 'ABCDE'.split('').map((_, idx) => String.fromCharCode(65 + ((seed + idx) % 26))).join('');
      const letter1 = String.fromCharCode(65 + (seed % 26));
      data.pan = encryptField(normalisePan(`${letters5}${randomDigits(4, seed)}${letter1}`));
    }
    if (!e.aadhaarNumber) data.aadhaarNumber = encryptField(normaliseAadhaar(randomDigits(12, seed + 10)));
    if (!e.bankAccountNo) data.bankAccountNo = normaliseBankAccount(randomDigits(12, seed + 20));
    if (!e.bankIfsc) data.bankIfsc = normaliseIfsc(`HDFC0${String(1000 + seed).padStart(6, '0')}`);
    if (!e.uanNumber) data.uanNumber = encryptField(normaliseUan(randomDigits(12, seed + 30)));
    if (!e.pfNumber) data.pfNumber = encryptField(`PF${randomDigits(10, seed + 40)}`);
    if (!e.esicNumber) data.esicNumber = encryptField(normaliseEsic(randomDigits(10, seed + 50)));

    if (Object.keys(data).length === 0) {
      console.log(`  ${e.firstName} ${e.lastName} — already complete, skipped.`);
      continue;
    }

    await prisma.employee.update({ where: { id: e.id }, data });
    updated += 1;
    console.log(`  ${e.firstName} ${e.lastName} — filled ${Object.keys(data).length} field(s).`);
  }

  console.log(`\n  Done. Updated ${updated} of ${employees.length} employee record(s).`);
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
