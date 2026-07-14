export type TrainingTemplateQuestion = {
  question: string
  questionAr: string
  optionA: string
  optionAAr: string
  optionB: string
  optionBAr: string
  optionC: string
  optionCAr: string
  optionD: string
  optionDAr: string
  correctOption: string
}

export type TrainingTemplate = {
  id: string
  label: string
  labelAr: string
  title: string
  titleAr: string
  category: string
  description: string
  descriptionAr: string
  content: string
  contentAr: string
  questions: TrainingTemplateQuestion[]
}

const question = (
  questionEn: string, questionAr: string, choices: [string, string, string, string], choicesAr: [string, string, string, string], correctOption: string
): TrainingTemplateQuestion => ({
  question: questionEn, questionAr, optionA: choices[0], optionAAr: choicesAr[0], optionB: choices[1], optionBAr: choicesAr[1],
  optionC: choices[2], optionCAr: choicesAr[2], optionD: choices[3], optionDAr: choicesAr[3], correctOption,
})

export const trainingTemplates: TrainingTemplate[] = [
  {
    id: 'workplace-safety', label: 'Workplace safety', labelAr: 'السلامة المهنية', category: 'SAFETY',
    title: 'Workplace Safety Fundamentals', titleAr: 'أساسيات السلامة المهنية',
    description: 'Core workplace hazard awareness, controls, PPE, and reporting.', descriptionAr: 'التوعية بمخاطر العمل ووسائل التحكم ومعدات الوقاية والإبلاغ.',
    content: 'Identify hazards before work starts, apply the hierarchy of controls, use PPE correctly, and report unsafe conditions immediately.', contentAr: 'حدد المخاطر قبل بدء العمل، وطبق تسلسل وسائل التحكم، واستخدم معدات الوقاية بشكل صحيح، وأبلغ فورًا عن الظروف غير الآمنة.',
    questions: [question('What is the first step in hazard control?', 'ما أول خطوة للتحكم بالمخاطر؟', ['Identify the hazard', 'Ignore it', 'Buy PPE', 'Start work'], ['تحديد الخطر', 'تجاهله', 'شراء معدات الوقاية', 'بدء العمل'], 'A'), question('When should unsafe conditions be reported?', 'متى يجب الإبلاغ عن الظروف غير الآمنة؟', ['At year end', 'Immediately', 'After injury only', 'Never'], ['في نهاية العام', 'فورًا', 'بعد الإصابة فقط', 'أبدًا'], 'B')],
  },
  {
    id: 'food-safety', label: 'Food safety', labelAr: 'سلامة الغذاء', category: 'FOOD_SAFETY',
    title: 'Food Safety and Hygiene', titleAr: 'سلامة الغذاء والنظافة',
    description: 'Hygiene, cross-contamination prevention, storage, and temperature control.', descriptionAr: 'النظافة ومنع التلوث المتبادل والتخزين والتحكم في درجات الحرارة.',
    content: 'Wash hands correctly, separate raw and ready-to-eat food, sanitize surfaces, and keep food at safe temperatures.', contentAr: 'اغسل اليدين بطريقة صحيحة، وافصل الأغذية النيئة عن الجاهزة للأكل، وطهّر الأسطح، واحفظ الطعام في درجات حرارة آمنة.',
    questions: [question('What prevents cross-contamination?', 'ما الذي يمنع التلوث المتبادل؟', ['Using the same knife', 'Separating raw and ready-to-eat food', 'Leaving food uncovered', 'Skipping cleaning'], ['استخدام نفس السكين', 'فصل النيء عن الجاهز للأكل', 'ترك الطعام مكشوفًا', 'تجاهل التنظيف'], 'B'), question('When must hands be washed?', 'متى يجب غسل اليدين؟', ['Before handling food', 'Once a week', 'Only after work', 'Never'], ['قبل التعامل مع الطعام', 'مرة أسبوعيًا', 'بعد العمل فقط', 'أبدًا'], 'A')],
  },
  {
    id: 'fire-safety', label: 'Fire safety', labelAr: 'السلامة من الحريق', category: 'HSE',
    title: 'Fire Prevention and Emergency Response', titleAr: 'الوقاية من الحريق والاستجابة للطوارئ',
    description: 'Fire prevention, alarm response, evacuation, and extinguisher awareness.', descriptionAr: 'الوقاية من الحريق والاستجابة للإنذار والإخلاء والتوعية بطفايات الحريق.',
    content: 'Keep escape routes clear, know the alarm and assembly point, evacuate without delay, and only use an extinguisher when trained and safe.', contentAr: 'أبقِ طرق الهروب خالية، واعرف الإنذار ونقطة التجمع، وأخلِ الموقع دون تأخير، ولا تستخدم الطفاية إلا إذا كنت مدربًا وكان ذلك آمنًا.',
    questions: [question('What should you do on hearing a fire alarm?', 'ماذا تفعل عند سماع إنذار الحريق؟', ['Finish the task', 'Evacuate to the assembly point', 'Use the elevator', 'Hide'], ['إنهاء المهمة', 'الإخلاء إلى نقطة التجمع', 'استخدام المصعد', 'الاختباء'], 'B'), question('Who should use a fire extinguisher?', 'من يستخدم طفاية الحريق؟', ['Anyone without training', 'A trained person when safe', 'Visitors only', 'Nobody'], ['أي شخص دون تدريب', 'شخص مدرب عندما يكون ذلك آمنًا', 'الزوار فقط', 'لا أحد'], 'B')],
  },
  {
    id: 'first-aid', label: 'First aid', labelAr: 'الإسعافات الأولية', category: 'HSE',
    title: 'Basic First Aid Awareness', titleAr: 'التوعية بالإسعافات الأولية',
    description: 'Initial response, emergency communication, and safe assistance.', descriptionAr: 'الاستجابة الأولية والتواصل في الطوارئ والمساعدة الآمنة.',
    content: 'Assess scene safety first, call for trained assistance, provide only the aid you are trained to give, and record the incident.', contentAr: 'قيّم سلامة الموقع أولًا، واطلب مساعدة مدربة، وقدّم فقط الإسعاف الذي تدربت عليه، وسجّل الحادث.',
    questions: [question('What comes first at an incident scene?', 'ما الذي يأتي أولًا في موقع الحادث؟', ['Scene safety', 'Moving the casualty', 'Taking photos', 'Leaving'], ['سلامة الموقع', 'نقل المصاب', 'التقاط الصور', 'المغادرة'], 'A'), question('What aid should you provide?', 'ما الإسعاف الذي يجب تقديمه؟', ['Any treatment', 'Only aid you are trained to provide', 'Medication to everyone', 'None'], ['أي علاج', 'فقط الإسعاف الذي تدربت عليه', 'دواء للجميع', 'لا شيء'], 'B')],
  },
  {
    id: 'environmental', label: 'Environmental awareness', labelAr: 'الوعي البيئي', category: 'HSE',
    title: 'Environmental Awareness and Waste Management', titleAr: 'الوعي البيئي وإدارة النفايات',
    description: 'Waste segregation, spill prevention, and resource conservation.', descriptionAr: 'فرز النفايات ومنع الانسكابات وترشيد الموارد.',
    content: 'Segregate waste at source, prevent spills from reaching drains, conserve water and energy, and report environmental incidents promptly.', contentAr: 'افرز النفايات من المصدر، وامنع وصول الانسكابات إلى المصارف، ورشّد الماء والطاقة، وأبلغ فورًا عن الحوادث البيئية.',
    questions: [question('Where should hazardous waste go?', 'أين توضع النفايات الخطرة؟', ['General bin', 'Labeled hazardous-waste container', 'Drain', 'Office desk'], ['حاوية عامة', 'حاوية نفايات خطرة مميزة', 'المصرف', 'مكتب'], 'B'), question('What should happen after a spill?', 'ماذا يجب أن يحدث بعد الانسكاب؟', ['Ignore it', 'Report and control it safely', 'Wash it into a drain', 'Cover it and leave'], ['تجاهله', 'الإبلاغ عنه والسيطرة عليه بأمان', 'غسله إلى المصرف', 'تغطيته وتركه'], 'B')],
  },
  {
    id: 'quality', label: 'Quality management', labelAr: 'إدارة الجودة', category: 'QUALITY',
    title: 'Quality Management Fundamentals', titleAr: 'أساسيات إدارة الجودة',
    description: 'Process control, nonconformity reporting, and continual improvement.', descriptionAr: 'ضبط العمليات والإبلاغ عن عدم المطابقة والتحسين المستمر.',
    content: 'Follow approved procedures, verify work against requirements, report nonconformities, and use corrective actions to prevent recurrence.', contentAr: 'اتبع الإجراءات المعتمدة، وتحقق من العمل مقابل المتطلبات، وأبلغ عن عدم المطابقة، واستخدم الإجراءات التصحيحية لمنع التكرار.',
    questions: [question('What should be done with a nonconformity?', 'ماذا يجب فعله عند عدم المطابقة؟', ['Hide it', 'Report it and take corrective action', 'Ignore it', 'Blame someone'], ['إخفاؤها', 'الإبلاغ عنها واتخاذ إجراء تصحيحي', 'تجاهلها', 'لوم شخص'], 'B'), question('Why follow approved procedures?', 'لماذا نتبع الإجراءات المعتمدة؟', ['For consistent quality', 'To slow work', 'Only for audits', 'No reason'], ['لضمان جودة متسقة', 'لإبطاء العمل', 'للتدقيق فقط', 'لا سبب'], 'A')],
  },
]
