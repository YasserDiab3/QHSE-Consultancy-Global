import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@qhsseconsultant.com' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@qhsseconsultant.com',
      password: adminPassword,
      role: 'ADMIN',
      language: 'en',
    },
  })
  console.log('Created admin user:', admin.email)

  // Create sample clients
  const clientPassword = await bcrypt.hash('client123', 12)

  const client1 = await prisma.user.upsert({
    where: { email: 'ahmed@petrocorp.com' },
    update: {},
    create: {
      name: 'Ahmed Al-Rashid',
      email: 'ahmed@petrocorp.com',
      password: clientPassword,
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
  console.log('Created client:', client1.client?.companyName)

  const client2 = await prisma.user.upsert({
    where: { email: 'sarah@foodtech.com' },
    update: {},
    create: {
      name: 'Sarah Johnson',
      email: 'sarah@foodtech.com',
      password: clientPassword,
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
  console.log('Created client:', client2.client?.companyName)

  // Create sample reports for client 1
  if (client1.client) {
    const report1 = await prisma.report.create({
      data: {
        clientId: client1.client.id,
        date: new Date('2025-03-15'),
        siteName: 'PetroCorp Main Facility',
        siteNameAr: 'منشأة بتروكورب الرئيسية',
        category: 'SAFETY',
        consultantId: admin.id,
        notes: 'Annual safety inspection conducted. Several high-risk items identified requiring immediate attention.',
        notesAr: 'تم إجراء التفتيش الأمني السنوي. تم تحديد العديد من العناصر عالية الخطورة التي تتطلب اهتماماً فورياً.',
        status: 'IN_PROGRESS',
        observations: {
          create: [
            {
              title: 'Missing Safety Guards on Machinery',
              titleAr: 'عدم وجود حراسات أمان على الآلات',
              description: 'Several rotating machines were found without proper safety guards, posing significant risk to operators.',
              descriptionAr: 'تم العثور على عدة آلات دوارة بدون حراسات أمان مناسبة، مما يشكل خطراً كبيراً على المشغلين.',
              riskLevel: 'HIGH',
              status: 'OPEN',
              sortOrder: 1,
            },
            {
              title: 'Inadequate Fire Extinguishers',
              titleAr: 'طفايات حريق غير كافية',
              description: 'Fire extinguishers in warehouse area are past expiry date and need replacement.',
              descriptionAr: 'طفايات الحريق في منطقة المستودع منتهية الصلاحية وتحتاج إلى استبدال.',
              riskLevel: 'MEDIUM',
              status: 'IN_PROGRESS',
              sortOrder: 2,
            },
            {
              title: 'Proper PPE Usage',
              titleAr: 'الاستخدام المناسب لمعدات الحماية الشخصية',
              description: 'Workers were observed wearing appropriate PPE in designated areas.',
              descriptionAr: 'تم ملاحظة العمال يرتدون معدات الحماية الشخصية المناسبة في المناطق المحددة.',
              riskLevel: 'LOW',
              status: 'CLOSED',
              sortOrder: 3,
            },
            {
              title: 'Chemical Storage Labels Missing',
              titleAr: 'ملصقات تخزين المواد الكيميائية مفقودة',
              description: 'Chemical containers in storage area lack proper hazard labels and safety data sheets.',
              descriptionAr: 'عبوات المواد الكيميائية في منطقة التخزين تفتقر إلى ملصقات المخاطر المناسبة وبيانات السلامة.',
              riskLevel: 'CRITICAL',
              status: 'OPEN',
              sortOrder: 4,
            },
          ],
        },
      },
    })
    console.log('Created report:', report1.siteName)

    const report2 = await prisma.report.create({
      data: {
        clientId: client1.client.id,
        date: new Date('2025-02-20'),
        siteName: 'PetroCorp Warehouse B',
        siteNameAr: 'مستودع بتروكورب ب',
        category: 'RISK_ASSESSMENT',
        consultantId: admin.id,
        notes: 'Comprehensive risk assessment completed for warehouse operations.',
        status: 'CLOSED',
        observations: {
          create: [
            {
              title: 'Forklift Operating Procedures',
              titleAr: 'إجراءات تشغيل الرافعة الشوكية',
              description: 'Updated forklift operating procedures documented and posted.',
              riskLevel: 'LOW',
              status: 'CLOSED',
              sortOrder: 1,
            },
            {
              title: 'Emergency Exit Blocked',
              titleAr: 'مخرج الطوارئ مسدود',
              description: 'Main emergency exit in warehouse B was blocked by stored materials.',
              riskLevel: 'HIGH',
              status: 'CLOSED',
              sortOrder: 2,
            },
          ],
        },
      },
    })
    console.log('Created report:', report2.siteName)
  }

  // Create sample reports for client 2
  if (client2.client) {
    const report3 = await prisma.report.create({
      data: {
        clientId: client2.client.id,
        date: new Date('2025-03-10'),
        siteName: 'FoodTech Processing Plant',
        siteNameAr: 'مصنع معالجة فودتك',
        category: 'FOOD_SAFETY',
        consultantId: admin.id,
        notes: 'HACCP compliance audit conducted. Overall good compliance with minor gaps.',
        status: 'OPEN',
        observations: {
          create: [
            {
              title: 'Temperature Monitoring Records',
              titleAr: 'سجلات مراقبة درجة الحرارة',
              description: 'Cold storage temperature logs show consistent monitoring with proper documentation.',
              riskLevel: 'LOW',
              status: 'CLOSED',
              sortOrder: 1,
            },
            {
              title: 'Cross-Contamination Risk',
              titleAr: 'خطر التلوث المتبادل',
              description: 'Raw and cooked food processing areas need better physical separation.',
              descriptionAr: 'تحتاج مناطق معالجة الأغذية الخام والمطبوخة إلى فصل مادي أفضل.',
              riskLevel: 'HIGH',
              status: 'OPEN',
              sortOrder: 2,
            },
            {
              title: 'Hand Washing Stations',
              titleAr: 'محطات غسل اليدين',
              description: 'Additional hand washing stations required near packaging area.',
              riskLevel: 'MEDIUM',
              status: 'IN_PROGRESS',
              sortOrder: 3,
            },
          ],
        },
      },
    })
    console.log('Created report:', report3.siteName)
  }

  console.log('Seeding completed successfully!')
}

main()
  .catch((e) => {
    console.error('Seeding error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
