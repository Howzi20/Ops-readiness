/**
 * Brings an existing database up to date with rules that changed over time.
 * Safe to run any number of times; it never deletes data. Run by `npm run update`.
 */
import { PrismaClient } from "@prisma/client";
import { renumberTemplateWorkstreams, renumberWorkstreams } from "../../src/modules/readiness/templates";

const db = new PrismaClient();

async function main() {
  // workstreams are numbered 1, 2, 3… in order (no 1A / 7A / 14)
  for (const t of await db.template.findMany({ select: { id: true } })) await renumberTemplateWorkstreams(db, t.id);
  for (const s of await db.site.findMany({ select: { id: true } })) await renumberWorkstreams(db, s.id);
  // contact organisation "JLL" became "TEAM" ("Our team")
  await db.contact.updateMany({ where: { organisation: "JLL" }, data: { organisation: "TEAM" } });
  console.log("Database maintenance complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
