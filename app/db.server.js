import { PrismaClient } from "@prisma/client";

let prisma;

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient();
  // Diagnostic logging for database connection parameters
  const dbUrl = process.env.DATABASE_URL || "";
  try {
    const urlObj = new URL(dbUrl);
    console.log(`[DB INFO] Host: ${urlObj.hostname}, Database: ${urlObj.pathname}, Pooler: ${urlObj.hostname.includes("-pooler")}`);
  } catch (err) {
    console.log(`[DB INFO] Unable to parse DATABASE_URL: ${dbUrl ? "present" : "missing"}`);
  }
} else {
  if (!global.__db__) {
    global.__db__ = new PrismaClient();
  }
  prisma = global.__db__;
  prisma.$connect();
}

export { prisma };
