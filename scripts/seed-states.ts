import "dotenv/config";

import { prisma } from "../src/server/db";
import { slugify } from "../src/lib/utils/slug";

/**
 * Loads India's states and union territories.
 *
 *   npm run db:seed:states
 *
 * Only adds what is missing. A state an administrator has already created or
 * edited — renamed, made inactive, given a code — is matched by its slug and
 * left exactly as it is, so running this twice, or after editing, changes
 * nothing that was already there.
 *
 * ISO 3166-2:IN codes are deliberately not included. The list was revised
 * recently, and reference data seeded from memory that turns out wrong is worse
 * than a blank an administrator fills in from the current standard.
 */
const STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

const UNION_TERRITORIES = [
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

async function main() {
  const rows = [
    ...STATES.map((name) => ({ name, kind: "STATE" as const })),
    ...UNION_TERRITORIES.map((name) => ({
      name,
      kind: "UNION_TERRITORY" as const,
    })),
  ];

  let created = 0;
  for (const row of rows) {
    const slug = slugify(row.name);
    const existing = await prisma.state.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (existing) continue;
    await prisma.state.create({
      data: { name: row.name, slug, kind: row.kind },
    });
    created += 1;
  }

  console.log(
    `${created} added, ${rows.length - created} already present (${STATES.length} states, ${UNION_TERRITORIES.length} union territories).`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error instanceof Error ? error.message : error);
    await prisma.$disconnect();
    process.exit(1);
  });
