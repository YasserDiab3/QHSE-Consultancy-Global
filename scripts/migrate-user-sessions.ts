import { prisma } from '../lib/prisma'

async function main() {
  console.log('Running UserSessionLog database migration...')
  
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "UserSessionLog" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "ipaddress" TEXT,
        "countrycode" TEXT,
        "countryname" TEXT,
        "region" TEXT,
        "city" TEXT,
        "latitude" DOUBLE PRECISION,
        "longitude" DOUBLE PRECISION,
        "accuracy" DOUBLE PRECISION,
        "device" TEXT,
        "browser" TEXT,
        "os" TEXT,
        "useragent" TEXT,
        "status" TEXT NOT NULL DEFAULT 'ACTIVE',
        "loginat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "lastactiveat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "logoutat" TIMESTAMP(3),

        CONSTRAINT "UserSessionLog_pkey" PRIMARY KEY ("id")
    );
  `)
  console.log('✔ Table "UserSessionLog" created or already exists.')

  try {
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'UserSessionLog_userId_fkey'
        ) THEN
          ALTER TABLE "UserSessionLog" ADD CONSTRAINT "UserSessionLog_userId_fkey" 
          FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$;
    `)
    console.log('✔ Foreign key constraint verified.')
  } catch (err: any) {
    console.warn('Note on foreign key:', err.message)
  }

  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "UserSessionLog_userId_idx" ON "UserSessionLog"("userId");`)
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "UserSessionLog_status_idx" ON "UserSessionLog"("status");`)
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "UserSessionLog_loginat_idx" ON "UserSessionLog"("loginat" DESC);`)
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "UserSessionLog_lastactiveat_idx" ON "UserSessionLog"("lastactiveat" DESC);`)
  console.log('✔ Indexes created or verified.')

  console.log('Migration completed successfully!')
}

main()
  .catch((e) => {
    console.error('Migration failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
