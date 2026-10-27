import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'

const prisma = new PrismaClient()
const isProduction = process.env.NODE_ENV === 'production'

function generatePassword() {
  return randomBytes(18).toString('base64url')
}

async function main() {
  console.log('Seeding database...')

  const adminEmail = (process.env.SEED_ADMIN_EMAIL || (isProduction ? '' : 'admin@qhsse.local'))
    .trim()
    .toLowerCase()

  if (!adminEmail) {
    throw new Error('SEED_ADMIN_EMAIL is required when seeding a production database.')
  }

  let adminPassword = process.env.SEED_ADMIN_PASSWORD
  if (!adminPassword) {
    if (isProduction) {
      throw new Error('SEED_ADMIN_PASSWORD is required when seeding a production database.')
    }

    adminPassword = generatePassword()
    console.log('Generated development admin password (store it now):', adminPassword)
  }

  if (adminPassword.length < 12) {
    throw new Error('SEED_ADMIN_PASSWORD must be at least 12 characters long.')
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12)
  const rotatePassword = process.env.SEED_FORCE_ADMIN_PASSWORD === 'true'
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } })

  const admin = existingAdmin
    ? await prisma.user.update({
        where: { email: adminEmail },
        data: {
          role: 'ADMIN',
          ...(rotatePassword ? { password: passwordHash } : {}),
        },
      })
    : await prisma.user.create({
        data: {
          name: 'Administrator',
          email: adminEmail,
          password: passwordHash,
          role: 'ADMIN',
          language: 'en',
        },
      })

  console.log(
    existingAdmin
      ? `✓ Admin ${admin.email} already exists; password ${rotatePassword ? 'rotated' : 'left unchanged'}.`
      : `✓ Created admin user: ${admin.email}`
  )

  if (process.env.SEED_DEMO_DATA !== 'true') {
    console.log('Demo clients and reports were skipped. Set SEED_DEMO_DATA=true to create them.')
    return
  }

  let demoPassword = process.env.SEED_DEMO_PASSWORD
  if (!demoPassword) {
    if (isProduction) {
      throw new Error('SEED_DEMO_PASSWORD is required when SEED_DEMO_DATA=true in production.')
    }

    demoPassword = generatePassword()
    console.log('Generated development demo-client password:', demoPassword)
  }

  const demoHash = await bcrypt.hash(demoPassword, 12)

  const client1 = await prisma.user.upsert({
    where: { email: 'ahmed@petrocorp.example' },
    update: {},
    create: {
      name: 'Ahmed Al-Rashid',
      email: 'ahmed@petrocorp.example',
      password: demoHash,
      role: 'CLIENT',
      language: 'en',
      client: {
        create: {
          companyName: 'PetroCorp Industries',
          companyNameAr: 'شركة بتروكورب للصناعات',
          phone: '+971 50 123 4567',
          address: 'Industrial Area, Abu Dhabi',
        },
      },
    },
    include: { client: true },
  })
  console.log('✓ Demo client:', client1.client?.companyName)

  const client2 = await prisma.user.upsert({
    where: { email: 'sarah@foodtech.example' },
    update: {},
    create: {
      name: 'Sarah Johnson',
      email: 'sarah@foodtech.example',
      password: demoHash,
      role: 'CLIENT',
      language: 'en',
      client: {
        create: {
          companyName: 'FoodTech Solutions',
          companyNameAr: 'حلول فودتك',
          phone: '+971 55 987 6543',
          address: 'Dubai Investment Park',
        },
      },
    },
    include: { client: true },
  })
  console.log('✓ Demo client:', client2.client?.companyName)

  if (client1.client) {
    await prisma.report.upsert({
      where: { id: 'report-petro-1' },
      update: {},
      create: {
        id: 'report-petro-1',
        clientId: client1.client.id,
        date: new Date('2025-03-15'),
        siteName: 'PetroCorp Main Facility',
        siteNameAr: 'منشأة بتروكورب الرئيسية',
        category: 'SAFETY',
        consultantId: admin.id,
        notes: 'Annual safety inspection conducted. Several high-risk items identified.',
        notesAr: 'تم إجراء التفتيش الأمني السنوي. تم تحديد عناصر عالية الخطورة.',
        status: 'IN_PROGRESS',
        observations: {
          create: [
            {
              title: 'Missing Safety Guards on Machinery',
              titleAr: 'عدم وجود حراسات أمان على الآلات',
              description: 'Several rotating machines without proper safety guards.',
              descriptionAr: 'عدة آلات بدون حراسات أمان مناسبة.',
              riskLevel: 'HIGH',
              status: 'OPEN',
              sortOrder: 1,
            },
            {
              title: 'Inadequate Fire Extinguishers',
              titleAr: 'طفايات حريق غير كافية',
              description: 'Fire extinguishers in warehouse past expiry date.',
              descriptionAr: 'طفايات الحريق منتهية الصلاحية.',
              riskLevel: 'MEDIUM',
              status: 'IN_PROGRESS',
              sortOrder: 2,
            },
            {
              title: 'Proper PPE Usage',
              titleAr: 'الاستخدام المناسب لمعدات الحماية',
              description: 'Workers observed wearing appropriate PPE.',
              riskLevel: 'LOW',
              status: 'CLOSED',
              sortOrder: 3,
            },
            {
              title: 'Chemical Storage Labels Missing',
              titleAr: 'ملصقات تخزين المواد الكيميائية مفقودة',
              description: 'Chemical containers lack proper hazard labels.',
              descriptionAr: 'عبوات المواد الكيميائية تفتقر إلى ملصقات المخاطر.',
              riskLevel: 'CRITICAL',
              status: 'OPEN',
              sortOrder: 4,
            },
          ],
        },
      },
    })
    console.log('✓ Demo report: PetroCorp Main Facility')

    await prisma.report.upsert({
      where: { id: 'report-petro-2' },
      update: {},
      create: {
        id: 'report-petro-2',
        clientId: client1.client.id,
        date: new Date('2025-02-20'),
        siteName: 'PetroCorp Warehouse B',
        siteNameAr: 'مستودع بتروكورب ب',
        category: 'RISK_ASSESSMENT',
        consultantId: admin.id,
        notes: 'Comprehensive risk assessment completed.',
        status: 'CLOSED',
        observations: {
          create: [
            {
              title: 'Forklift Operating Procedures',
              titleAr: 'إجراءات تشغيل الرافعة الشوكية',
              description: 'Updated procedures documented and posted.',
              riskLevel: 'LOW',
              status: 'CLOSED',
              sortOrder: 1,
            },
            {
              title: 'Emergency Exit Blocked',
              titleAr: 'مخرج الطوارئ مسدود',
              description: 'Emergency exit blocked by stored materials.',
              riskLevel: 'HIGH',
              status: 'CLOSED',
              sortOrder: 2,
            },
          ],
        },
      },
    })
    console.log('✓ Demo report: PetroCorp Warehouse B')
  }

  if (client2.client) {
    await prisma.report.upsert({
      where: { id: 'report-food-1' },
      update: {},
      create: {
        id: 'report-food-1',
        clientId: client2.client.id,
        date: new Date('2025-03-10'),
        siteName: 'FoodTech Processing Plant',
        siteNameAr: 'مصنع معالجة فودتك',
        category: 'FOOD_SAFETY',
        consultantId: admin.id,
        notes: 'HACCP compliance audit. Good compliance with minor gaps.',
        status: 'OPEN',
        observations: {
          create: [
            {
              title: 'Temperature Monitoring Records',
              titleAr: 'سجلات مراقبة درجة الحرارة',
              description: 'Cold storage logs show consistent monitoring.',
              riskLevel: 'LOW',
              status: 'CLOSED',
              sortOrder: 1,
            },
            {
              title: 'Cross-Contamination Risk',
              titleAr: 'خطر التلوث المتبادل',
              description: 'Raw and cooked areas need better separation.',
              descriptionAr: 'تحتاج المناطق إلى فصل أفضل.',
              riskLevel: 'HIGH',
              status: 'OPEN',
              sortOrder: 2,
            },
            {
              title: 'Hand Washing Stations',
              titleAr: 'محطات غسل اليدين',
              description: 'Additional stations required near packaging area.',
              riskLevel: 'MEDIUM',
              status: 'IN_PROGRESS',
              sortOrder: 3,
            },
          ],
        },
      },
    })
    console.log('✓ Demo report: FoodTech Processing Plant')
  }

  console.log('\n✅ Seeding completed successfully.')
}

main()
  .catch((error) => {
    console.error('Seeding error:', error instanceof Error ? error.message : error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
