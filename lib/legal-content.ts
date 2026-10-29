import type { Language } from '@/lib/i18n-config'

export type LegalSection = {
  id: string
  title: string
  paragraphs?: string[]
  bullets?: string[]
}

export type LegalDocument = {
  title: string
  eyebrow: string
  updated: string
  intro: string
  sections: LegalSection[]
  contact: string
}

export type BilingualLegalDocument = Record<Language, LegalDocument>

const UPDATED_AR = '27 أكتوبر 2026'
const UPDATED_EN = '27 October 2026'

export const privacyPolicy: BilingualLegalDocument = {
  ar: {
    title: 'سياسة الخصوصية',
    eyebrow: 'الخصوصية وحماية البيانات',
    updated: `آخر تحديث: ${UPDATED_AR}`,
    intro:
      'توضح هذه السياسة كيف تجمع QHSSE Consultant البيانات الشخصية وتستخدمها وتحميها عند استخدامك للموقع وبوابة العملاء ومنصة التدريب ونماذج التواصل والتوظيف. نلتزم بتقليل البيانات إلى الحد اللازم، وبعدم استخدامها إلا للأغراض الموضحة أدناه.',
    contact:
      'لأي استفسار أو طلب يتعلق ببياناتك الشخصية، راسلنا على info@hsehub360.com. سنرد خلال 30 يومًا من التحقق من هويتك.',
    sections: [
      {
        id: 'who-we-are',
        title: '1. من نحن ونطاق السياسة',
        paragraphs: [
          'QHSSE Consultant شركة استشارية متخصصة في الجودة والصحة والسلامة والبيئة، ومقرها القاهرة، جمهورية مصر العربية، وتعمل بشكل أساسي في مصر والإمارات. تشمل خدماتنا الاستشارات والتفتيش وتقييم المخاطر والتدريب وبوابة العملاء.',
          'تسري هذه السياسة على الموقع الإلكتروني، ونماذج التواصل وطلب الخدمات، والتقديم على الوظائف، ومنصة التدريب والاختبارات والشهادات، وبوابة العملاء والمستندات، وأي اتصالات مرتبطة بهذه الخدمات.',
        ],
      },
      {
        id: 'data-we-collect',
        title: '2. البيانات التي نجمعها',
        bullets: [
          'بيانات الحساب: الاسم والبريد الإلكتروني ورقم الهاتف والشركة وكلمة المرور المشفّرة.',
          'بيانات التواصل: الاسم والبريد والهاتف والشركة ونص الرسالة والخدمة المطلوبة.',
          'بيانات التوظيف: الاسم والبريد والهاتف والسيرة الذاتية والرسالة التعريفية.',
          'بيانات بوابة العملاء: المستندات والتقارير والملاحظات والصور التي يرفعها فريقنا أو العميل.',
          'بيانات التدريب: التسجيل، والإجابات، والنتيجة، وحالة الشهادة ورمز التحقق.',
          'بيانات تحليلية عند موافقتك: الصفحات التي تزورها، والدولة والمدينة التقريبية، ونوع المتصفح، ومعرّف زيارة عشوائي، وعنوان IP مختصر.',
          'بيانات تقنية: سجلات الأخطاء والأمان اللازمة لتشغيل الخدمة وحمايتها.',
        ],
      },
      {
        id: 'how-we-collect',
        title: '3. كيف نجمع البيانات',
        bullets: [
          'مباشرة منك عند إنشاء حساب أو إرسال نموذج أو التقدم لوظيفة أو رفع مستند أو إكمال تدريب.',
          'تلقائيًا عند زيارة الموقع، ولكن القياسات التحليلية لا تعمل قبل موافقتك.',
          'عبر ملف تعريف ارتباط ضروري لحفظ اللغة المختارة، وملفات تخزين محلية لحفظ حالة الموافقة ومعرّف الزيارة عند الموافقة.',
        ],
      },
      {
        id: 'purposes',
        title: '4. أغراض المعالجة والأساس القانوني',
        bullets: [
          'تنفيذ الخدمات وإدارة حسابك والرد على طلباتك: أساسه تنفيذ العقد أو اتخاذ خطوات قبل التعاقد.',
          'تحسين الموقع وجودة الخدمة وحماية الأنظمة: أساسه مصلحة مشروعة في تشغيل خدمة آمنة وفعّالة، مع موازنة لا تضر بحقوقك.',
          'القياسات التحليلية: أساسه موافقتك الصريحة، ويمكنك سحبها في أي وقت.',
          'الوفاء بالالتزامات القانونية والمحاسبية والرد على الجهات المختصة: أساسه الالتزام القانوني.',
          'إرسال تحديثات أو عروض تجارية: لا نرسلها إلا بموافقتك أو ضمن علاقة تعاقدية قائمة، ويمكنك إلغاء الاشتراك في أي وقت.',
        ],
      },
      {
        id: 'sharing',
        title: '5. المشاركة والمعالجون',
        paragraphs: [
          'لا نبيع بياناتك الشخصية. نشاركها فقط مع مزودي خدمات يعملون نيابةً عنا وبما يلزم لتشغيل الخدمة، مثل مزود الاستضافة وقاعدة البيانات السحابية (Supabase)، ومزود البريد الإلكتروني، ومزود المصادقة عبر Google إذا اخترت تسجيل الدخول به، ومقدمي الخدمات المهنية أو الجهات المختصة عندما يقتضي القانون ذلك.',
          'نطلب من المعالجين تطبيق ضوابط أمنية مناسبة، ولا نمنحهم حق استخدام بياناتك لأغراضهم الخاصة.',
        ],
      },
      {
        id: 'transfers',
        title: '6. التحويلات الدولية',
        paragraphs: [
          'قد تُعالج البيانات لدى مزودي خدمات في دول أخرى. عند حدوث ذلك، نعتمد على الضوابط التعاقدية والتنظيمية المناسبة لحماية البيانات، ونقتصر على ما يلزم لتقديم الخدمة.',
        ],
      },
      {
        id: 'retention',
        title: '7. مدة الاحتفاظ',
        bullets: [
          'حساب المستخدم: طوال مدة الحساب، ثم لمدة تصل إلى 30 يومًا بعد طلب الحذف، مع الاحتفاظ بما يلزم قانونًا.',
          'طلبات التواصل: حتى 24 شهرًا من آخر تواصل.',
          'طلبات التوظيف: حتى 12 شهرًا، ما لم توافق على الاحتفاظ بها لمدة أطول.',
          'البيانات التحليلية: حتى 12 شهرًا.',
          'السجلات المالية والتعاقدية: للمدة التي يفرضها القانون أو اللوائح المحاسبية.',
          'النسخ الاحتياطية: دورة محدودة لا تتجاوز 90 يومًا، ثم تُحذف أو تُستبدل.',
        ],
      },
      {
        id: 'security',
        title: '8. الأمان',
        paragraphs: [
          'نستخدم اتصالات مشفّرة، وتخزينًا مشفّرًا لكلمات المرور، وضوابط وصول مبنية على الأدوار، وتقييد الوصول إلى قاعدة البيانات من الخادم، ومراجعة صلاحيات المشرفين. لا توجد وسيلة نقل أو تخزين آمنة بنسبة 100%، لكننا نراجع الضوابط ونحدّثها باستمرار.',
        ],
      },
      {
        id: 'rights',
        title: '9. حقوقك',
        bullets: [
          'الاطلاع على بياناتك الشخصية والحصول على نسخة منها.',
          'تصحيح البيانات غير الدقيقة أو تحديثها.',
          'طلب الحذف أو تقييد المعالجة عندما يسمح القانون.',
          'الاعتراض على المعالجة القائمة على المصلحة المشروعة.',
          'سحب الموافقة على القياسات التحليلية في أي وقت.',
          'طلب نقل البيانات بصيغة مقروءة آليًا حيث ينطبق.',
          'تقديم شكوى إلى الجهة الرقابية المختصة في بلد إقامتك.',
        ],
        paragraphs: [
          'لممارسة أي من هذه الحقوق، راسلنا على البريد أدناه. قد نطلب معلومات إضافية للتحقق من هويتك قبل تنفيذ الطلب.',
        ],
      },
      {
        id: 'cookies',
        title: '10. ملفات تعريف الارتباط والتحليلات',
        paragraphs: [
          'نستخدم ملف تعريف ارتباط ضروريًا لحفظ اللغة المختارة، وملفات تخزين محلية لحفظ قرار الموافقة. لا نستخدم ملفات تعريف ارتباط إعلانية أو نشارك بياناتك مع شبكات إعلانية.',
          'لا تعمل القياسات التحليلية قبل ضغطك على «أوافق» في شريط الخصوصية. يمكنك تغيير قرارك عبر رابط «إعدادات الخصوصية» في تذييل الموقع.',
        ],
      },
      {
        id: 'children',
        title: '11. الأطفال',
        paragraphs: [
          'خدماتنا موجهة للمؤسسات والمهنيين، ولا تستهدف من هم دون 16 عامًا. إذا اكتشفنا جمع بيانات طفل دون هذا السن دون موافقة ولي الأمر، فسنحذفها.',
        ],
      },
      {
        id: 'changes',
        title: '12. التغييرات والتواصل',
        paragraphs: [
          'قد نحدّث هذه السياسة عند تغيّر خدماتنا أو المتطلبات القانونية، وسننشر النسخة المحدثة على هذه الصفحة مع تاريخ التحديث. التغييرات الجوهرية تُبلَّغ عبر الموقع أو البريد الإلكتروني عند الاقتضاء.',
          'للتواصل: QHSSE Consultant، Cairo Business Park, El Nasr, New Cairo 1, Cairo Governorate 11865, Egypt — info@hsehub360.com — +20 111 775 5096.',
        ],
      },
    ],
  },
  en: {
    title: 'Privacy Policy',
    eyebrow: 'Privacy & data protection',
    updated: `Last updated: ${UPDATED_EN}`,
    intro:
      'This policy explains how QHSSE Consultant collects, uses and protects personal data when you use our website, client portal, training platform, contact forms and recruitment pages. We minimise the data we collect and use it only for the purposes described below.',
    contact:
      'For any privacy question or request, email info@hsehub360.com. We will respond within 30 days of verifying your identity.',
    sections: [
      {
        id: 'who-we-are',
        title: '1. Who we are and what this policy covers',
        paragraphs: [
          'QHSSE Consultant is a quality, health, safety and environmental consultancy based in Cairo, Egypt, working primarily across Egypt and the UAE. Our services include advisory work, inspections, risk assessments, training and a client portal.',
          'This policy applies to our website, contact and service-request forms, job applications, the training and certificate platform, the client portal and documents, and related communications.',
        ],
      },
      {
        id: 'data-we-collect',
        title: '2. Data we collect',
        bullets: [
          'Account data: name, email, phone, company and a hashed password.',
          'Contact data: name, email, phone, company, message and requested service.',
          'Recruitment data: name, email, phone, CV and cover letter.',
          'Client portal data: documents, reports, notes and images uploaded by our team or the client.',
          'Training data: enrolment, answers, score, certificate status and verification code.',
          'Analytics data, only with your consent: pages visited, approximate country and city, browser type, a random visit identifier and a shortened IP address.',
          'Technical data: error and security logs needed to operate and protect the service.',
        ],
      },
      {
        id: 'how-we-collect',
        title: '3. How we collect data',
        bullets: [
          'Directly from you when you create an account, submit a form, apply for a job, upload a document or complete training.',
          'Automatically when you visit the site, but analytics does not run before you consent.',
          'Through an essential cookie that stores your language choice, and local storage that remembers your consent decision and, if accepted, a random visit identifier.',
        ],
      },
      {
        id: 'purposes',
        title: '4. Purposes and lawful bases',
        bullets: [
          'Delivering services, managing your account and responding to requests: performance of a contract or pre-contractual steps.',
          'Improving the site and service quality and protecting our systems: our legitimate interest in running a secure, effective service, balanced against your rights.',
          'Analytics: your explicit consent, which you can withdraw at any time.',
          'Meeting legal, accounting and regulatory obligations: compliance with law.',
          'Service updates or commercial offers: only with your consent or within an existing contractual relationship, and you can opt out at any time.',
        ],
      },
      {
        id: 'sharing',
        title: '5. Sharing and processors',
        paragraphs: [
          'We do not sell personal data. We share it only with service providers acting on our behalf and only as needed to operate the service, such as our hosting and cloud database provider (Supabase), email provider, Google authentication if you choose Google sign-in, and professional advisers or authorities where required by law.',
          'Processors are required to apply appropriate security controls and may not use your data for their own purposes.',
        ],
      },
      {
        id: 'transfers',
        title: '6. International transfers',
        paragraphs: [
          'Data may be processed by providers in other countries. Where this happens, we rely on appropriate contractual and regulatory safeguards and limit processing to what is necessary to provide the service.',
        ],
      },
      {
        id: 'retention',
        title: '7. Retention',
        bullets: [
          'User accounts: for the life of the account and up to 30 days after a deletion request, except where we must retain data by law.',
          'Contact requests: up to 24 months from the last contact.',
          'Job applications: up to 12 months unless you agree to a longer period.',
          'Analytics data: up to 12 months.',
          'Financial and contractual records: for the period required by law or accounting rules.',
          'Backups: a limited cycle of no more than 90 days, after which data is deleted or replaced.',
        ],
      },
      {
        id: 'security',
        title: '8. Security',
        paragraphs: [
          'We use encrypted connections, hashed passwords, role-based access controls, server-only database access and periodic review of administrator permissions. No method of transmission or storage is completely secure, but we review and update our controls regularly.',
        ],
      },
      {
        id: 'rights',
        title: '9. Your rights',
        bullets: [
          'Access your personal data and receive a copy.',
          'Correct or update inaccurate data.',
          'Request deletion or restriction where the law allows.',
          'Object to processing based on legitimate interests.',
          'Withdraw analytics consent at any time.',
          'Request portability in a machine-readable format where applicable.',
          'Complain to the competent supervisory authority in your country of residence.',
        ],
        paragraphs: [
          'To exercise any of these rights, email us using the address below. We may ask for additional information to verify your identity before acting on a request.',
        ],
      },
      {
        id: 'cookies',
        title: '10. Cookies and analytics',
        paragraphs: [
          'We use one essential cookie to remember your language choice and local storage to remember your consent decision. We do not use advertising cookies or share data with advertising networks.',
          'Analytics does not run until you select “Accept” in the privacy banner. You can change your decision at any time using the “Privacy settings” link in the site footer.',
        ],
      },
      {
        id: 'children',
        title: '11. Children',
        paragraphs: [
          'Our services are intended for organisations and professionals and are not directed at anyone under 16. If we discover that we collected a child’s data below that age without parental consent, we will delete it.',
        ],
      },
      {
        id: 'changes',
        title: '12. Changes and contact',
        paragraphs: [
          'We may update this policy when our services or legal requirements change. The updated version will be published on this page with its revision date. Material changes will be communicated on the site or by email where appropriate.',
          'Contact: QHSSE Consultant, Cairo Business Park, El Nasr, New Cairo 1, Cairo Governorate 11865, Egypt — info@hsehub360.com — +20 111 775 5096.',
        ],
      },
    ],
  },
}

export const termsOfService: BilingualLegalDocument = {
  ar: {
    title: 'شروط الاستخدام',
    eyebrow: 'الشروط والأحكام',
    updated: `آخر تحديث: ${UPDATED_AR}`,
    intro:
      'تنظم هذه الشروط استخدامك لموقع QHSSE Consultant وبوابة العملاء ومنصة التدريب. باستخدامك للخدمة فإنك توافق على هذه الشروط. إذا كنت تستخدم الموقع نيابةً عن مؤسسة، فأنت تقر بأنك مخوّل بقبولها عنها.',
    contact:
      'لأي استفسار عن هذه الشروط، راسلنا على info@hsehub360.com أو اتصل على +20 111 775 5096.',
    sections: [
      {
        id: 'acceptance',
        title: '1. قبول الشروط',
        paragraphs: [
          'يُعد دخولك إلى الموقع أو استخدام أي من خدماته موافقةً على هذه الشروط وسياسة الخصوصية. إذا لم توافق، يرجى عدم استخدام الخدمة.',
        ],
      },
      {
        id: 'services',
        title: '2. طبيعة الخدمات',
        paragraphs: [
          'نقدم خدمات استشارية وتدريبية وتقييمات وتقارير مهنية. التقارير والنتائج تعكس رأيًا مهنيًا مبنيًا على المعلومات والظروف المتاحة وقت العمل، ولا تُعد ضمانًا لنتيجة معينة أو لنجاح تدقيق أو الحصول على شهادة.',
          'لا تضمن المنصة أو المواد التدريبية اجتياز أي اختبار أو اعتماد خارجي. أي شهادة تصدرها المنصة تفيد إتمام التدريب وفق معاييرنا المعلنة، وليست ترخيصًا مهنيًا أو شهادة اعتماد من جهة خارجية ما لم يُنص على ذلك صراحةً.',
        ],
      },
      {
        id: 'accounts',
        title: '3. الحسابات والمسؤوليات',
        bullets: [
          'تقديم معلومات دقيقة ومحدثة عند التسجيل.',
          'الحفاظ على سرية بيانات الدخول وعدم مشاركتها.',
          'إبلاغنا فورًا عن أي استخدام غير مصرح به لحسابك.',
          'تحمل مسؤولية الأنشطة التي تتم عبر حسابك.',
        ],
        paragraphs: [
          'يجوز لنا تعليق الحساب أو إلغاؤه عند مخالفة هذه الشروط أو عند وجود خطر أمني أو قانوني.',
        ],
      },
      {
        id: 'acceptable-use',
        title: '4. الاستخدام المقبول',
        bullets: [
          'عدم استخدام الخدمة في أي غرض غير قانوني أو احتيالي.',
          'عدم محاولة الوصول إلى بيانات أو حسابات لا تخصك.',
          'عدم تعطيل الخدمة أو إدخال برمجيات ضارة أو إجراء هندسة عكسية.',
          'عدم جمع بيانات الموقع آليًا أو إعادة نشر محتواه دون إذن كتابي.',
          'عدم انتحال شخصية أو مؤسسة أخرى.',
        ],
      },
      {
        id: 'ip',
        title: '5. المحتوى والملكية الفكرية',
        paragraphs: [
          'جميع مواد الموقع والتصاميم والعلامات والمنهجيات والمواد التدريبية مملوكة لـ QHSSE Consultant أو مرخّص لها، ومحمية بالقوانين المعمول بها.',
          'نمنح العميل ترخيصًا محدودًا وغير حصري وغير قابل للتحويل لاستخدام التقارير والمستندات المسلّمة لأغراضه الداخلية. لا يجوز إعادة بيعها أو نشرها أو تعديلها دون موافقة كتابية، مع الاحتفاظ بحق الإسناد المهني.',
        ],
      },
      {
        id: 'reports',
        title: '6. التقارير والشهادات والتحقق',
        paragraphs: [
          'يمكن التحقق من الشهادات عبر صفحة التحقق باستخدام رمز الشهادة. لا يجوز تعديل الشهادات أو التقارير أو استخدامها بشكل مضلل، ويجوز لنا إلغاء أي شهادة صدرت بناءً على معلومات غير صحيحة.',
        ],
      },
      {
        id: 'fees',
        title: '7. الرسوم والدفع',
        paragraphs: [
          'تُحدد رسوم الخدمات في عرض الخدمة أو الاتفاق الموقّع. لا تتم المدفوعات عبر الموقع حاليًا. ما لم يُنص على خلاف ذلك، تُستحق الرسوم وفق جدول الدفع المتفق عليه، وتُضاف الضرائب المطبقة حيث يلزم.',
        ],
      },
      {
        id: 'disclaimer',
        title: '8. إخلاء المسؤولية',
        paragraphs: [
          'يُقدَّم الموقع ومحتواه «كما هو» دون ضمانات صريحة أو ضمنية بشأن التوافر أو الدقة أو الملاءمة لغرض معين. لا نضمن أن يكون الموقع خاليًا من الأخطاء أو الانقطاعات، ونحتفظ بحق تعديل المحتوى أو إيقاف الخدمة.',
        ],
      },
      {
        id: 'liability',
        title: '9. حدود المسؤولية',
        paragraphs: [
          'إلى الحد الذي يسمح به القانون، لا نتحمل المسؤولية عن أي أضرار غير مباشرة أو تبعية أو خسارة أرباح أو بيانات. وتقتصر المسؤولية الإجمالية عن أي مطالبة على الرسوم المدفوعة مقابل الخدمة المعنية خلال الاثني عشر شهرًا السابقة للمطالبة.',
          'لا يستبعد أو يحد هذا البند أي مسؤولية لا يجوز استبعادها أو الحد منها قانونًا.',
        ],
      },
      {
        id: 'indemnity',
        title: '10. التعويض',
        paragraphs: [
          'توافق على تعويض QHSSE Consultant عن أي خسائر أو مطالبات تنشأ عن استخدامك غير المشروع للخدمة أو مخالفتك لهذه الشروط أو حقوق طرف ثالث.',
        ],
      },
      {
        id: 'termination',
        title: '11. الإنهاء',
        paragraphs: [
          'يجوز لنا تعليق أو إنهاء وصولك عند مخالفة الشروط أو عند الحاجة لحماية الخدمة أو الامتثال للقانون. يمكنك التوقف عن استخدام الخدمة في أي وقت. تستمر البنود التي بطبيعتها يجب أن تبقى، مثل الملكية الفكرية وحدود المسؤولية، بعد الإنهاء.',
        ],
      },
      {
        id: 'law',
        title: '12. القانون الحاكم والتسوية',
        paragraphs: [
          'تخضع هذه الشروط لقوانين جمهورية مصر العربية. نسعى أولًا إلى تسوية أي نزاع وديًا خلال 30 يومًا، وإلا تختص محاكم القاهرة بالنظر فيه، ما لم يفرض القانون جهة أخرى.',
        ],
      },
      {
        id: 'changes',
        title: '13. التغييرات والتواصل',
        paragraphs: [
          'قد نحدّث هذه الشروط من وقت لآخر وننشر النسخة الجديدة على هذه الصفحة. يُعد استمرارك في استخدام الخدمة بعد النشر موافقةً على التغييرات.',
          'للتواصل: QHSSE Consultant، Cairo Business Park, El Nasr, New Cairo 1, Cairo Governorate 11865, Egypt — info@hsehub360.com — +20 111 775 5096.',
        ],
      },
    ],
  },
  en: {
    title: 'Terms of Service',
    eyebrow: 'Terms & conditions',
    updated: `Last updated: ${UPDATED_EN}`,
    intro:
      'These terms govern your use of the QHSSE Consultant website, client portal and training platform. By using the service, you agree to these terms. If you use the site on behalf of an organisation, you confirm that you are authorised to accept them for that organisation.',
    contact:
      'For questions about these terms, email info@hsehub360.com or call +20 111 775 5096.',
    sections: [
      {
        id: 'acceptance',
        title: '1. Acceptance',
        paragraphs: [
          'Accessing the site or using any of its services constitutes acceptance of these terms and the privacy policy. If you do not agree, please do not use the service.',
        ],
      },
      {
        id: 'services',
        title: '2. Nature of the services',
        paragraphs: [
          'We provide advisory, training, assessment and professional reporting services. Reports and findings reflect a professional opinion based on the information and conditions available at the time of work and are not a guarantee of a particular outcome, audit success or certification.',
          'The platform and training materials do not guarantee passing any external examination or accreditation. A certificate issued by the platform confirms completion of training against our published criteria and is not a professional licence or third-party accreditation unless expressly stated.',
        ],
      },
      {
        id: 'accounts',
        title: '3. Accounts and responsibilities',
        bullets: [
          'Provide accurate and current registration information.',
          'Keep login credentials confidential and do not share them.',
          'Notify us immediately of any unauthorised use of your account.',
          'Accept responsibility for activity carried out through your account.',
        ],
        paragraphs: [
          'We may suspend or terminate an account for a breach of these terms or where there is a security or legal risk.',
        ],
      },
      {
        id: 'acceptable-use',
        title: '4. Acceptable use',
        bullets: [
          'Do not use the service for unlawful or fraudulent purposes.',
          'Do not attempt to access data or accounts that are not yours.',
          'Do not disrupt the service, introduce malware or reverse engineer it.',
          'Do not scrape or republish site content without written permission.',
          'Do not impersonate another person or organisation.',
        ],
      },
      {
        id: 'ip',
        title: '5. Content and intellectual property',
        paragraphs: [
          'All site materials, designs, marks, methodologies and training content are owned by or licensed to QHSSE Consultant and are protected by applicable law.',
          'Clients receive a limited, non-exclusive, non-transferable licence to use delivered reports and documents for internal purposes. They may not be resold, published or modified without written consent, and professional attribution must be preserved.',
        ],
      },
      {
        id: 'reports',
        title: '6. Reports, certificates and verification',
        paragraphs: [
          'Certificates can be verified through the verification page using the certificate code. Certificates and reports may not be altered or used misleadingly, and we may revoke a certificate issued on the basis of inaccurate information.',
        ],
      },
      {
        id: 'fees',
        title: '7. Fees and payment',
        paragraphs: [
          'Service fees are set out in the applicable proposal or signed agreement. Payments are not currently processed through the website. Unless stated otherwise, fees are due according to the agreed payment schedule, and applicable taxes are added where required.',
        ],
      },
      {
        id: 'disclaimer',
        title: '8. Disclaimer',
        paragraphs: [
          'The site and its content are provided “as is” without express or implied warranties of availability, accuracy or fitness for a particular purpose. We do not guarantee that the site will be error-free or uninterrupted and reserve the right to change content or suspend the service.',
        ],
      },
      {
        id: 'liability',
        title: '9. Limitation of liability',
        paragraphs: [
          'To the extent permitted by law, we are not liable for indirect or consequential loss, lost profits or lost data. Our total liability for any claim is limited to the fees paid for the relevant service in the twelve months preceding the claim.',
          'Nothing in this section excludes or limits liability that cannot lawfully be excluded or limited.',
        ],
      },
      {
        id: 'indemnity',
        title: '10. Indemnity',
        paragraphs: [
          'You agree to indemnify QHSSE Consultant against losses or claims arising from your unlawful use of the service, your breach of these terms or your infringement of third-party rights.',
        ],
      },
      {
        id: 'termination',
        title: '11. Termination',
        paragraphs: [
          'We may suspend or terminate your access for a breach of these terms or where necessary to protect the service or comply with law. You may stop using the service at any time. Clauses that by their nature should survive, such as intellectual property and liability limits, continue after termination.',
        ],
      },
      {
        id: 'law',
        title: '12. Governing law and disputes',
        paragraphs: [
          'These terms are governed by the laws of the Arab Republic of Egypt. We will first attempt to resolve any dispute amicably within 30 days; otherwise, the courts of Cairo have jurisdiction, unless the law requires another forum.',
        ],
      },
      {
        id: 'changes',
        title: '13. Changes and contact',
        paragraphs: [
          'We may update these terms from time to time and will publish the new version on this page. Continued use of the service after publication constitutes acceptance of the changes.',
          'Contact: QHSSE Consultant, Cairo Business Park, El Nasr, New Cairo 1, Cairo Governorate 11865, Egypt — info@hsehub360.com — +20 111 775 5096.',
        ],
      },
    ],
  },
}
