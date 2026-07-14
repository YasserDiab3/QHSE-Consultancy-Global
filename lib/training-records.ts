import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'

export type TrainingCourseRecord = {
  id: string
  slug: string
  title: string
  titleAr: string | null
  category: string
  description: string | null
  descriptionAr: string | null
  content: string
  contentAr: string | null
  passingScore: number
  isPublished: boolean
  sortOrder: number
}

export type TrainingQuestionRecord = {
  id: string
  courseId: string
  question: string
  questionAr: string | null
  optionA: string
  optionAAr: string | null
  optionB: string
  optionBAr: string | null
  optionC: string
  optionCAr: string | null
  optionD: string
  optionDAr: string | null
  correctOption: string
  sortOrder: number
}

export type TrainingCertificateRecord = {
  id: string
  userId: string
  courseId: string
  status: string
  score: number | null
  passed: boolean
  attempts: number
  certificateCode: string | null
  certificateIssuedAt: Date | string | null
  completedAt: Date | string | null
  userName: string | null
  userEmail: string | null
  courseTitle: string
  courseTitleAr: string | null
  category: string
}

export type TrainingAttemptResult = {
  score: number
  totalQuestions: number
  correctAnswers: number
  passed: boolean
  passingScore: number
  certificateCode: string | null
}

let ensurePromise: Promise<void> | null = null

function escapeSqlString(value: string) {
  return value.replace(/'/g, "''")
}

function sqlValue(value?: string | null) {
  if (value == null || value === '') {
    return 'NULL'
  }

  return `'${escapeSqlString(value)}'`
}

function boolValue(value: boolean) {
  return value ? 'TRUE' : 'FALSE'
}

function jsonValue(value: unknown) {
  return `'${escapeSqlString(JSON.stringify(value))}'::jsonb`
}

function numberValue(value: number, fallback = 0) {
  return Number.isFinite(value) ? String(value) : String(fallback)
}

function createCertificateCode() {
  return `QHSSE-TR-${new Date().getFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`
}

async function createTrainingTables() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "TrainingCourse" (
      "id" TEXT PRIMARY KEY,
      "slug" TEXT NOT NULL UNIQUE,
      "title" TEXT NOT NULL,
      "titleAr" TEXT,
      "category" TEXT NOT NULL,
      "description" TEXT,
      "descriptionAr" TEXT,
      "content" TEXT NOT NULL,
      "contentAr" TEXT,
      "passingScore" INTEGER NOT NULL DEFAULT 80,
      "isPublished" BOOLEAN NOT NULL DEFAULT TRUE,
      "sortOrder" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "TrainingQuestion" (
      "id" TEXT PRIMARY KEY,
      "courseId" TEXT NOT NULL,
      "question" TEXT NOT NULL,
      "questionAr" TEXT,
      "optionA" TEXT NOT NULL,
      "optionAAr" TEXT,
      "optionB" TEXT NOT NULL,
      "optionBAr" TEXT,
      "optionC" TEXT NOT NULL,
      "optionCAr" TEXT,
      "optionD" TEXT NOT NULL,
      "optionDAr" TEXT,
      "correctOption" TEXT NOT NULL,
      "sortOrder" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "TrainingEnrollment" (
      "id" TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "courseId" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
      "score" INTEGER,
      "passed" BOOLEAN NOT NULL DEFAULT FALSE,
      "attempts" INTEGER NOT NULL DEFAULT 0,
      "certificateCode" TEXT UNIQUE,
      "certificateIssuedAt" TIMESTAMP,
      "completedAt" TIMESTAMP,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE ("userId", "courseId")
    )
  `)

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "TrainingAttempt" (
      "id" TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "courseId" TEXT NOT NULL,
      "score" INTEGER NOT NULL,
      "passed" BOOLEAN NOT NULL DEFAULT FALSE,
      "answers" JSONB NOT NULL,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "TrainingCourse_published_sort_idx"
      ON "TrainingCourse" ("isPublished", "sortOrder")
  `)
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "TrainingQuestion_course_sort_idx"
      ON "TrainingQuestion" ("courseId", "sortOrder")
  `)
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "TrainingEnrollment_user_idx"
      ON "TrainingEnrollment" ("userId")
  `)
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "TrainingAttempt_user_course_idx"
      ON "TrainingAttempt" ("userId", "courseId")
  `)
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "TrainingAttempt_created_idx"
      ON "TrainingAttempt" ("createdAt" DESC)
  `)
}

async function seedDefaultTrainingContent() {
  const existing = await prisma.$queryRawUnsafe<{ count: bigint | number }[]>(`
    SELECT COUNT(*)::int AS count FROM "TrainingCourse"
  `)

  if (Number(existing[0]?.count ?? 0) > 0) {
    return
  }

  const courses = [
    {
      id: randomUUID(),
      slug: 'safety-basics',
      title: 'Workplace Safety Fundamentals',
      titleAr: 'أساسيات السلامة المهنية',
      category: 'SAFETY',
      description: 'A practical introduction to workplace hazards, controls, PPE, and incident prevention.',
      descriptionAr: 'مقدمة عملية عن المخاطر المهنية ووسائل التحكم ومعدات الوقاية ومنع الحوادث.',
      content:
        'This training explains the foundations of workplace safety: identifying hazards, applying the hierarchy of controls, using personal protective equipment correctly, reporting unsafe conditions, and responding to emergencies. Trainees should be able to recognize common risks and choose preventive actions that reduce harm before incidents happen.',
      contentAr:
        'يوضح هذا التدريب أساسيات السلامة المهنية: تحديد المخاطر، تطبيق التسلسل الهرمي لوسائل التحكم، استخدام معدات الوقاية الشخصية بشكل صحيح، الإبلاغ عن الظروف غير الآمنة، والاستجابة للطوارئ. بعد التدريب يجب أن يكون المتدرب قادرا على تمييز المخاطر الشائعة واختيار إجراءات وقائية تقلل الضرر قبل وقوع الحوادث.',
      passingScore: 80,
      sortOrder: 1,
      questions: [
        {
          question: 'What is the first step in managing workplace hazards?',
          questionAr: 'ما هي الخطوة الأولى في إدارة مخاطر مكان العمل؟',
          optionA: 'Ignore minor hazards',
          optionAAr: 'تجاهل المخاطر الصغيرة',
          optionB: 'Identify the hazard',
          optionBAr: 'تحديد الخطر',
          optionC: 'Buy new equipment',
          optionCAr: 'شراء معدات جديدة',
          optionD: 'Wait for an incident',
          optionDAr: 'انتظار وقوع حادث',
          correctOption: 'B',
        },
        {
          question: 'Which control is preferred before relying on PPE?',
          questionAr: 'أي وسيلة تحكم يفضل تطبيقها قبل الاعتماد على معدات الوقاية الشخصية؟',
          optionA: 'Engineering controls',
          optionAAr: 'التحكم الهندسي',
          optionB: 'Warning signs only',
          optionBAr: 'لافتات التحذير فقط',
          optionC: 'Verbal reminders',
          optionCAr: 'التذكير الشفهي',
          optionD: 'No control',
          optionDAr: 'عدم تطبيق أي تحكم',
          correctOption: 'A',
        },
        {
          question: 'When should unsafe conditions be reported?',
          questionAr: 'متى يجب الإبلاغ عن الظروف غير الآمنة؟',
          optionA: 'At the end of the year',
          optionAAr: 'في نهاية العام',
          optionB: 'Only after injury',
          optionBAr: 'بعد حدوث إصابة فقط',
          optionC: 'Immediately',
          optionCAr: 'فورا',
          optionD: 'Never',
          optionDAr: 'لا يتم الإبلاغ عنها',
          correctOption: 'C',
        },
        {
          question: 'What does PPE help protect?',
          questionAr: 'ماذا تساعد معدات الوقاية الشخصية على حمايته؟',
          optionA: 'Documents only',
          optionAAr: 'المستندات فقط',
          optionB: 'The worker from exposure to hazards',
          optionBAr: 'العامل من التعرض للمخاطر',
          optionC: 'Machines from dust only',
          optionCAr: 'الآلات من الغبار فقط',
          optionD: 'The office decoration',
          optionDAr: 'ديكور المكتب',
          correctOption: 'B',
        },
        {
          question: 'A good emergency response plan should be:',
          questionAr: 'يجب أن تكون خطة الاستجابة للطوارئ:',
          optionA: 'Written, trained, and tested',
          optionAAr: 'مكتوبة ويتم التدريب والاختبار عليها',
          optionB: 'Known by managers only',
          optionBAr: 'معروفة للمديرين فقط',
          optionC: 'Hidden from employees',
          optionCAr: 'مخفية عن الموظفين',
          optionD: 'Used after several incidents only',
          optionDAr: 'تستخدم بعد عدة حوادث فقط',
          correctOption: 'A',
        },
      ],
    },
    {
      id: randomUUID(),
      slug: 'food-safety-basics',
      title: 'Food Safety Fundamentals',
      titleAr: 'أساسيات سلامة الغذاء',
      category: 'FOOD_SAFETY',
      description: 'Essential food safety principles covering hygiene, cross-contamination, temperature control, and reporting.',
      descriptionAr: 'مبادئ أساسية لسلامة الغذاء تشمل النظافة ومنع التلوث المتبادل والتحكم في درجات الحرارة والإبلاغ.',
      content:
        'This training covers the basics of food safety: personal hygiene, cleaning and sanitation, preventing cross-contamination, safe storage, temperature control, and the importance of traceability. Trainees should understand how daily behavior affects food safety and consumer protection.',
      contentAr:
        'يغطي هذا التدريب أساسيات سلامة الغذاء: النظافة الشخصية، التنظيف والتطهير، منع التلوث المتبادل، التخزين الآمن، التحكم في درجات الحرارة، وأهمية التتبع. بعد التدريب يجب أن يفهم المتدرب كيف تؤثر الممارسات اليومية على سلامة الغذاء وحماية المستهلك.',
      passingScore: 80,
      sortOrder: 2,
      questions: [
        {
          question: 'What is cross-contamination?',
          questionAr: 'ما المقصود بالتلوث المتبادل؟',
          optionA: 'Moving harmful microbes or allergens from one item to another',
          optionAAr: 'انتقال الميكروبات الضارة أو مسببات الحساسية من عنصر إلى آخر',
          optionB: 'Improving food flavor',
          optionBAr: 'تحسين مذاق الطعام',
          optionC: 'Cooling food quickly',
          optionCAr: 'تبريد الطعام بسرعة',
          optionD: 'Labeling packages',
          optionDAr: 'وضع الملصقات على العبوات',
          correctOption: 'A',
        },
        {
          question: 'Hands should be washed:',
          questionAr: 'يجب غسل اليدين:',
          optionA: 'Only at the beginning of the shift',
          optionAAr: 'في بداية الوردية فقط',
          optionB: 'After handling raw food and after contamination risks',
          optionBAr: 'بعد التعامل مع الأغذية الخام وبعد أي احتمال للتلوث',
          optionC: 'Only when visibly dirty',
          optionCAr: 'عند اتساخها ظاهريا فقط',
          optionD: 'Once per day',
          optionDAr: 'مرة واحدة يوميا',
          correctOption: 'B',
        },
        {
          question: 'Why is temperature control important?',
          questionAr: 'لماذا التحكم في درجة الحرارة مهم؟',
          optionA: 'To prevent unsafe microbial growth',
          optionAAr: 'لمنع نمو الميكروبات بشكل غير آمن',
          optionB: 'To make storage rooms look organized',
          optionBAr: 'لجعل المخازن تبدو منظمة',
          optionC: 'To reduce paperwork',
          optionCAr: 'لتقليل الأوراق',
          optionD: 'It is not important',
          optionDAr: 'ليس مهما',
          correctOption: 'A',
        },
        {
          question: 'Cleaning and sanitizing are:',
          questionAr: 'التنظيف والتطهير هما:',
          optionA: 'The same thing in every case',
          optionAAr: 'نفس الشيء في كل الحالات',
          optionB: 'Optional steps',
          optionBAr: 'خطوات اختيارية',
          optionC: 'Different steps that work together to reduce contamination',
          optionCAr: 'خطوات مختلفة تعمل معا لتقليل التلوث',
          optionD: 'Only needed in offices',
          optionDAr: 'مطلوبة في المكاتب فقط',
          correctOption: 'C',
        },
        {
          question: 'Traceability helps the organization:',
          questionAr: 'يساعد التتبع المؤسسة على:',
          optionA: 'Hide product issues',
          optionAAr: 'إخفاء مشكلات المنتج',
          optionB: 'Identify and control affected products quickly',
          optionBAr: 'تحديد المنتجات المتأثرة والسيطرة عليها بسرعة',
          optionC: 'Avoid inspections',
          optionCAr: 'تجنب التفتيش',
          optionD: 'Remove labels',
          optionDAr: 'إزالة الملصقات',
          correctOption: 'B',
        },
      ],
    },
  ]

  for (const course of courses) {
    await prisma.$executeRawUnsafe(`
      INSERT INTO "TrainingCourse" (
        "id", "slug", "title", "titleAr", "category", "description", "descriptionAr",
        "content", "contentAr", "passingScore", "isPublished", "sortOrder"
      ) VALUES (
        ${sqlValue(course.id)}, ${sqlValue(course.slug)}, ${sqlValue(course.title)},
        ${sqlValue(course.titleAr)}, ${sqlValue(course.category)}, ${sqlValue(course.description)},
        ${sqlValue(course.descriptionAr)}, ${sqlValue(course.content)}, ${sqlValue(course.contentAr)},
        ${numberValue(course.passingScore, 80)}, TRUE, ${numberValue(course.sortOrder)}
      )
    `)

    for (const [index, question] of course.questions.entries()) {
      await prisma.$executeRawUnsafe(`
        INSERT INTO "TrainingQuestion" (
          "id", "courseId", "question", "questionAr", "optionA", "optionAAr", "optionB", "optionBAr",
          "optionC", "optionCAr", "optionD", "optionDAr", "correctOption", "sortOrder"
        ) VALUES (
          ${sqlValue(randomUUID())}, ${sqlValue(course.id)}, ${sqlValue(question.question)},
          ${sqlValue(question.questionAr)}, ${sqlValue(question.optionA)}, ${sqlValue(question.optionAAr)},
          ${sqlValue(question.optionB)}, ${sqlValue(question.optionBAr)}, ${sqlValue(question.optionC)},
          ${sqlValue(question.optionCAr)}, ${sqlValue(question.optionD)}, ${sqlValue(question.optionDAr)},
          ${sqlValue(question.correctOption)}, ${numberValue(index + 1)}
        )
      `)
    }
  }
}

export async function ensureTrainingTables() {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      await createTrainingTables()
      await seedDefaultTrainingContent()
    })().catch((error) => {
      ensurePromise = null
      throw error
    })
  }

  await ensurePromise
}

export async function listPublishedTrainingCourses() {
  await ensureTrainingTables()

  return prisma.$queryRawUnsafe<TrainingCourseRecord[]>(`
    SELECT *
    FROM "TrainingCourse"
    WHERE "isPublished" = TRUE
    ORDER BY "sortOrder" ASC, "createdAt" ASC
  `)
}

export async function getTrainingCourseBySlug(slug: string) {
  await ensureTrainingTables()

  const courses = await prisma.$queryRawUnsafe<TrainingCourseRecord[]>(`
    SELECT *
    FROM "TrainingCourse"
    WHERE "slug" = ${sqlValue(slug)}
      AND "isPublished" = TRUE
    LIMIT 1
  `)

  return courses[0] ?? null
}

export async function listTrainingQuestions(courseId: string, includeAnswers = false) {
  await ensureTrainingTables()

  const questions = await prisma.$queryRawUnsafe<TrainingQuestionRecord[]>(`
    SELECT *
    FROM "TrainingQuestion"
    WHERE "courseId" = ${sqlValue(courseId)}
    ORDER BY "sortOrder" ASC, "createdAt" ASC
  `)

  if (includeAnswers) {
    return questions
  }

  return questions.map((question) => ({
    ...question,
    correctOption: '',
  }))
}

export async function ensureTrainingEnrollment(userId: string, courseId: string) {
  await ensureTrainingTables()

  const existingRows = await prisma.$queryRawUnsafe<{ id: string }[]>(`
    SELECT "id"
    FROM "TrainingEnrollment"
    WHERE "userId" = ${sqlValue(userId)}
      AND "courseId" = ${sqlValue(courseId)}
    LIMIT 1
  `)

  if (existingRows[0]) {
    return existingRows[0]
  }

  const id = randomUUID()
  await prisma.$executeRawUnsafe(`
    INSERT INTO "TrainingEnrollment" (
      "id", "userId", "courseId", "status", "createdAt", "updatedAt"
    ) VALUES (
      ${sqlValue(id)}, ${sqlValue(userId)}, ${sqlValue(courseId)}, 'IN_PROGRESS',
      CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
    ON CONFLICT ("userId", "courseId") DO NOTHING
  `)

  return { id }
}

export async function submitTrainingAttempt(input: {
  userId: string
  courseId: string
  answers: Record<string, string>
}) {
  await ensureTrainingTables()

  const questions = await listTrainingQuestions(input.courseId, true)
  const courses = await prisma.$queryRawUnsafe<TrainingCourseRecord[]>(`
    SELECT *
    FROM "TrainingCourse"
    WHERE "id" = ${sqlValue(input.courseId)}
    LIMIT 1
  `)
  const course = courses[0]

  if (!course || questions.length === 0) {
    throw new Error('Training course is not ready')
  }

  const correctAnswers = questions.reduce((count, question) => {
    const answer = (input.answers[question.id] || '').trim().toUpperCase()
    return answer === question.correctOption.toUpperCase() ? count + 1 : count
  }, 0)
  const score = Math.round((correctAnswers / questions.length) * 100)
  const passed = score >= course.passingScore

  await prisma.$executeRawUnsafe(`
    INSERT INTO "TrainingAttempt" (
      "id", "userId", "courseId", "score", "passed", "answers", "createdAt"
    ) VALUES (
      ${sqlValue(randomUUID())}, ${sqlValue(input.userId)}, ${sqlValue(input.courseId)},
      ${numberValue(score)}, ${boolValue(passed)}, ${jsonValue(input.answers)}, CURRENT_TIMESTAMP
    )
  `)

  const existingRows = await prisma.$queryRawUnsafe<{ id: string; attempts: number; certificateCode: string | null }[]>(`
    SELECT "id", "attempts", "certificateCode"
    FROM "TrainingEnrollment"
    WHERE "userId" = ${sqlValue(input.userId)}
      AND "courseId" = ${sqlValue(input.courseId)}
    LIMIT 1
  `)
  const existing = existingRows[0]
  const attempts = Number(existing?.attempts ?? 0) + 1
  const certificateCode = passed ? existing?.certificateCode || createCertificateCode() : existing?.certificateCode || null

  if (existing) {
    await prisma.$executeRawUnsafe(`
      UPDATE "TrainingEnrollment"
      SET
        "status" = ${sqlValue(passed ? 'PASSED' : 'FAILED')},
        "score" = ${numberValue(score)},
        "passed" = ${boolValue(passed)},
        "attempts" = ${numberValue(attempts)},
        "certificateCode" = ${sqlValue(certificateCode)},
        "certificateIssuedAt" = ${passed ? 'COALESCE("certificateIssuedAt", CURRENT_TIMESTAMP)' : '"certificateIssuedAt"'},
        "completedAt" = CURRENT_TIMESTAMP,
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${sqlValue(existing.id)}
    `)
  } else {
    await prisma.$executeRawUnsafe(`
      INSERT INTO "TrainingEnrollment" (
        "id", "userId", "courseId", "status", "score", "passed", "attempts",
        "certificateCode", "certificateIssuedAt", "completedAt"
      ) VALUES (
        ${sqlValue(randomUUID())}, ${sqlValue(input.userId)}, ${sqlValue(input.courseId)},
        ${sqlValue(passed ? 'PASSED' : 'FAILED')}, ${numberValue(score)}, ${boolValue(passed)},
        ${numberValue(attempts)}, ${sqlValue(certificateCode)},
        ${passed ? 'CURRENT_TIMESTAMP' : 'NULL'}, CURRENT_TIMESTAMP
      )
    `)
  }

  return {
    score,
    totalQuestions: questions.length,
    correctAnswers,
    passed,
    passingScore: course.passingScore,
    certificateCode,
  } satisfies TrainingAttemptResult
}

export async function getTrainingCertificateByCode(code: string) {
  await ensureTrainingTables()

  const rows = await prisma.$queryRawUnsafe<TrainingCertificateRecord[]>(`
    SELECT
      e."id",
      e."userId",
      e."courseId",
      e."status",
      e."score",
      e."passed",
      e."attempts",
      e."certificateCode",
      e."certificateIssuedAt",
      e."completedAt",
      u."name" AS "userName",
      u."email" AS "userEmail",
      c."title" AS "courseTitle",
      c."titleAr" AS "courseTitleAr",
      c."category"
    FROM "TrainingEnrollment" e
    INNER JOIN "TrainingCourse" c ON c."id" = e."courseId"
    LEFT JOIN "User" u ON u."id" = e."userId"
    WHERE e."certificateCode" = ${sqlValue(code)}
      AND e."passed" = TRUE
    LIMIT 1
  `)

  return rows[0] ?? null
}
