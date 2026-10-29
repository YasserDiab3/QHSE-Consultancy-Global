/**
 * Financial & Invoicing Records Management Utility
 * Supports rich invoice metadata, line items, VAT, payment tracking,
 * Arabic Tafqit (number-to-words), and backward-compatible parsing.
 */

export interface FinancialItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  total: number
}

export type PaymentMethod = 'BANK_TRANSFER' | 'CASH' | 'CHEQUE' | 'ONLINE' | 'OTHER'

export interface BankDetails {
  bankName: string
  accountName: string
  iban: string
  accountNumber?: string
  swiftCode?: string
}

export interface FinancialDetails {
  invoiceNumber: string
  invoiceDate: string
  serviceType: string
  items: FinancialItem[]
  subtotal: number
  taxRate: number // Percentage (e.g. 14 for 14% VAT, 0 for exempt)
  taxAmount: number
  discount: number
  totalAmount: number
  paidAmount: number
  remainingAmount: number
  paymentMethod?: PaymentMethod
  paymentReference?: string
  paidAt?: string | null
  terms?: string
  clientTaxNumber?: string
  clientCrNumber?: string
  notesText?: string
  bankDetails?: BankDetails
}

export interface FinancialRecordView {
  id: string
  clientId: string
  title: string
  amount: number
  currency: string
  status: 'PENDING' | 'PAID' | 'PARTIAL' | 'CANCELLED'
  dueDate?: string | null
  createdAt: string
  details: FinancialDetails
}

export const SERVICE_TYPES: Record<string, { labelAr: string; labelEn: string; icon: string }> = {
  CONSULTATION: {
    labelAr: 'استشارات السلامة والصحة المهنية',
    labelEn: 'Occupational Health & Safety Consulting',
    icon: 'ShieldCheck',
  },
  INSPECTION: {
    labelAr: 'فحص ومعاينة ميدانية للموقع',
    labelEn: 'Site Inspection & Assessment',
    icon: 'Search',
  },
  AUDIT: {
    labelAr: 'مراجعة وتدقيق معايير الأمان (Audit)',
    labelEn: 'Safety Compliance Audit',
    icon: 'ClipboardCheck',
  },
  RISK_ASSESSMENT: {
    labelAr: 'إعداد وتقييم المخاطر (Risk Assessment)',
    labelEn: 'Risk Assessment Study',
    icon: 'AlertTriangle',
  },
  CIVIL_DEFENSE: {
    labelAr: 'اشتراطات وتراخيص الحماية المدنية',
    labelEn: 'Civil Defense & Fire Safety',
    icon: 'Flame',
  },
  TRAINING: {
    labelAr: 'تدريب وتأهيل الكوادر وفرق الطوارئ',
    labelEn: 'Workforce Safety Training',
    icon: 'GraduationCap',
  },
  ENVIRONMENTAL: {
    labelAr: 'قياسات ودراسات الأثر البيئي',
    labelEn: 'Environmental Impact Studies',
    icon: 'Leaf',
  },
  ANNUAL_CONTRACT: {
    labelAr: 'عقد استشارات وإشراف سنوي',
    labelEn: 'Annual Retainer & Oversight',
    icon: 'FileContract',
  },
  OTHER: {
    labelAr: 'خدمات استشارية أخرى',
    labelEn: 'Other Advisory Services',
    icon: 'FileText',
  },
}

export const STATUS_CONFIG: Record<
  string,
  { labelAr: string; labelEn: string; bg: string; text: string; border: string; dot: string }
> = {
  PAID: {
    labelAr: 'مسددة بالكامل',
    labelEn: 'Fully Paid',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
  },
  PENDING: {
    labelAr: 'مستحقة الدفع',
    labelEn: 'Pending / Due',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
  },
  PARTIAL: {
    labelAr: 'مسددة جزئياً',
    labelEn: 'Partially Paid',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    dot: 'bg-blue-500',
  },
  CANCELLED: {
    labelAr: 'ملغاة',
    labelEn: 'Cancelled',
    bg: 'bg-slate-100',
    text: 'text-slate-600',
    border: 'border-slate-200',
    dot: 'bg-slate-400',
  },
}

export const PAYMENT_METHODS: Record<PaymentMethod, { labelAr: string; labelEn: string }> = {
  BANK_TRANSFER: { labelAr: 'تحويل بنكي رسمي', labelEn: 'Bank Transfer' },
  CHEQUE: { labelAr: 'شيك مصرفي', labelEn: 'Cheque' },
  CASH: { labelAr: 'نقداً (خزينة)', labelEn: 'Cash' },
  ONLINE: { labelAr: 'دفع إلكتروني', labelEn: 'Electronic Payment' },
  OTHER: { labelAr: 'أخرى', labelEn: 'Other' },
}

/**
 * Parses raw Prisma record into a full FinancialRecordView.
 * Handles both new structured JSON notes and legacy plain text notes.
 */
export function parseFinancialRecord(record: {
  id: string
  clientId: string
  title: string
  amount: number | string | any
  currency?: string | null
  status?: string | null
  dueDate?: string | Date | null
  notes?: string | null
  createdAt?: string | Date | null
}): FinancialRecordView {
  const numericAmount = Math.max(0, Number(record.amount) || 0)
  const currency = (record.currency || 'EGP').toUpperCase()
  const rawStatus = (record.status || 'PENDING').toUpperCase()
  const status: 'PENDING' | 'PAID' | 'PARTIAL' | 'CANCELLED' =
    rawStatus === 'PAID' || rawStatus === 'PARTIAL' || rawStatus === 'CANCELLED' ? rawStatus : 'PENDING'

  const createdDate = record.createdAt ? new Date(record.createdAt) : new Date()
  const createdAtIso = createdDate.toISOString()
  const defaultInvoiceNumber = `INV-${createdDate.getFullYear()}-${record.id.replace(/-/g, '').slice(0, 5).toUpperCase()}`

  let details: FinancialDetails = {
    invoiceNumber: defaultInvoiceNumber,
    invoiceDate: createdDate.toISOString().slice(0, 10),
    serviceType: 'CONSULTATION',
    items: [
      {
        id: 'item-1',
        description: record.title || 'خدمات استشارية معتمدة',
        quantity: 1,
        unitPrice: numericAmount,
        total: numericAmount,
      },
    ],
    subtotal: numericAmount,
    taxRate: 0,
    taxAmount: 0,
    discount: 0,
    totalAmount: numericAmount,
    paidAmount: status === 'PAID' ? numericAmount : 0,
    remainingAmount: status === 'PAID' ? 0 : numericAmount,
    paymentMethod: 'BANK_TRANSFER',
    terms: 'يتم السداد خلال 15 يوماً من تاريخ استحقاق الفاتورة عبر التحويل البنكي المعتمد.',
  }

  if (record.notes && typeof record.notes === 'string') {
    const trimmed = record.notes.trim()
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed)
        const items: FinancialItem[] = Array.isArray(parsed.items) && parsed.items.length > 0
          ? parsed.items.map((it: any, index: number) => ({
              id: it.id || `item-${index + 1}`,
              description: String(it.description || '').trim() || record.title,
              quantity: Math.max(1, Number(it.quantity) || 1),
              unitPrice: Math.max(0, Number(it.unitPrice) || 0),
              total: Math.max(0, Number(it.total) || (Number(it.quantity) || 1) * (Number(it.unitPrice) || 0)),
            }))
          : details.items

        const subtotal = items.reduce((sum, item) => sum + item.total, 0) || numericAmount
        const taxRate = typeof parsed.taxRate === 'number' ? Math.max(0, parsed.taxRate) : 0
        const taxAmount = typeof parsed.taxAmount === 'number' ? parsed.taxAmount : (subtotal * taxRate) / 100
        const discount = typeof parsed.discount === 'number' ? Math.max(0, parsed.discount) : 0
        const computedTotal = Math.max(0, subtotal + taxAmount - discount)
        const totalAmount = computedTotal || numericAmount

        let paidAmount = status === 'PAID' ? totalAmount : (typeof parsed.paidAmount === 'number' ? Math.max(0, parsed.paidAmount) : 0)
        if (status === 'PAID') paidAmount = totalAmount
        const remainingAmount = Math.max(0, totalAmount - paidAmount)

        details = {
          invoiceNumber: String(parsed.invoiceNumber || defaultInvoiceNumber).trim(),
          invoiceDate: String(parsed.invoiceDate || createdDate.toISOString().slice(0, 10)).trim(),
          serviceType: String(parsed.serviceType || 'CONSULTATION').trim(),
          items,
          subtotal,
          taxRate,
          taxAmount,
          discount,
          totalAmount,
          paidAmount,
          remainingAmount,
          paymentMethod: parsed.paymentMethod || 'BANK_TRANSFER',
          paymentReference: parsed.paymentReference ? String(parsed.paymentReference).trim() : undefined,
          paidAt: parsed.paidAt || (status === 'PAID' ? createdAtIso : null),
          terms: parsed.terms ? String(parsed.terms).trim() : details.terms,
          clientTaxNumber: parsed.clientTaxNumber ? String(parsed.clientTaxNumber).trim() : undefined,
          clientCrNumber: parsed.clientCrNumber ? String(parsed.clientCrNumber).trim() : undefined,
          notesText: parsed.notesText ? String(parsed.notesText).trim() : undefined,
          bankDetails: parsed.bankDetails && typeof parsed.bankDetails === 'object' ? {
            bankName: String(parsed.bankDetails.bankName || '').trim(),
            accountName: String(parsed.bankDetails.accountName || '').trim(),
            iban: String(parsed.bankDetails.iban || '').trim(),
            accountNumber: parsed.bankDetails.accountNumber ? String(parsed.bankDetails.accountNumber).trim() : undefined,
            swiftCode: parsed.bankDetails.swiftCode ? String(parsed.bankDetails.swiftCode).trim() : undefined,
          } : undefined,
        }
      } catch {
        // Fall back to plain text note
        details.notesText = trimmed
      }
    } else {
      details.notesText = trimmed
    }
  }

  const dueDateStr = record.dueDate
    ? (record.dueDate instanceof Date ? record.dueDate.toISOString() : String(record.dueDate))
    : null

  return {
    id: record.id,
    clientId: record.clientId,
    title: record.title,
    amount: details.totalAmount || numericAmount,
    currency,
    status,
    dueDate: dueDateStr,
    createdAt: createdAtIso,
    details,
  }
}

/**
 * Serializes financial details into a JSON notes string.
 */
export function serializeFinancialDetails(details: Partial<FinancialDetails>): string {
  return JSON.stringify(details)
}

/**
 * Formats a currency amount with commas and locale symbol.
 */
export function formatFinancialAmount(amount: number, currency: string = 'EGP'): string {
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
  return `${formatted} ${currency}`
}

/**
 * Professional Arabic number-to-words converter (Tafqit).
 * Converts numeric amounts into formal Arabic text for invoices and financial receipts.
 * Example: 77000 EGP -> "فقط سبعة وسبعون ألف جنيه مصري لا غير"
 */
export function tafqitArabic(amount: number, currency: string = 'EGP'): string {
  if (isNaN(amount) || amount === 0) {
    return 'فقط صفر لا غير'
  }

  const isNegative = amount < 0
  const absAmount = Math.abs(amount)
  const integerPart = Math.floor(absAmount)
  const decimalPart = Math.round((absAmount - integerPart) * 100)

  const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة']
  const tens = ['', 'عشرة', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون']
  const teens = [
    'عشرة',
    'أحد عشر',
    'اثنا عشر',
    'ثلاثة عشر',
    'أربعة عشر',
    'خمسة عشر',
    'ستة عشر',
    'سبعة عشر',
    'ثمانية عشر',
    'تسعة عشر',
  ]
  const hundreds = [
    '',
    'مائة',
    'مائتان',
    'ثلاثمائة',
    'أربعمائة',
    'خمسمائة',
    'ستمائة',
    'سبعمائة',
    'ثمانمائة',
    'تسعمائة',
  ]

  function convertGroup(n: number): string {
    if (n === 0) return ''
    const h = Math.floor(n / 100)
    const rem = n % 100
    const parts: string[] = []

    if (h > 0) parts.push(hundreds[h])

    if (rem > 0) {
      if (rem <= 10) {
        parts.push(ones[rem])
      } else if (rem < 20) {
        parts.push(teens[rem - 10])
      } else {
        const o = rem % 10
        const t = Math.floor(rem / 10)
        if (o > 0) {
          parts.push(`${ones[o]} و${tens[t]}`)
        } else {
          parts.push(tens[t])
        }
      }
    }

    return parts.join(' و')
  }

  function convertFullInteger(num: number): string {
    if (num === 0) return 'صفر'

    const billions = Math.floor(num / 1_000_000_000)
    const millions = Math.floor((num % 1_000_000_000) / 1_000_000)
    const thousands = Math.floor((num % 1_000_000) / 1_000)
    const remainder = num % 1_000

    const groups: string[] = []

    if (billions > 0) {
      if (billions === 1) groups.push('مليار')
      else if (billions === 2) groups.push('ملياران')
      else if (billions >= 3 && billions <= 10) groups.push(`${convertGroup(billions)} مليارات`)
      else groups.push(`${convertGroup(billions)} مليار`)
    }

    if (millions > 0) {
      if (millions === 1) groups.push('مليون')
      else if (millions === 2) groups.push('مليونان')
      else if (millions >= 3 && millions <= 10) groups.push(`${convertGroup(millions)} ملايين`)
      else groups.push(`${convertGroup(millions)} مليون`)
    }

    if (thousands > 0) {
      if (thousands === 1) groups.push('ألف')
      else if (thousands === 2) groups.push('ألفان')
      else if (thousands >= 3 && thousands <= 10) groups.push(`${convertGroup(thousands)} آلاف`)
      else groups.push(`${convertGroup(thousands)} ألف`)
    }

    if (remainder > 0) {
      groups.push(convertGroup(remainder))
    }

    return groups.join(' و')
  }

  const currencyNames: Record<
    string,
    { mainSingle: string; mainDual: string; mainPlural: string; subSingle: string }
  > = {
    EGP: {
      mainSingle: 'جنيه مصري',
      mainDual: 'جنيهان مصريان',
      mainPlural: 'جنيهات مصرية',
      subSingle: 'قرش',
    },
    SAR: {
      mainSingle: 'ريال سعودي',
      mainDual: 'ريالان سعوديان',
      mainPlural: 'ريالات سعودية',
      subSingle: 'هللة',
    },
    USD: {
      mainSingle: 'دولار أمريكي',
      mainDual: 'دولاران أمريكيان',
      mainPlural: 'دولارات أمريكية',
      subSingle: 'سنت',
    },
    EUR: {
      mainSingle: 'يورو',
      mainDual: 'يورو',
      mainPlural: 'يورو',
      subSingle: 'سنت',
    },
  }

  const curr = currencyNames[currency.toUpperCase()] || {
    mainSingle: currency,
    mainDual: currency,
    mainPlural: currency,
    subSingle: 'جزء',
  }

  let text = convertFullInteger(integerPart)
  if (integerPart === 1) text += ` ${curr.mainSingle}`
  else if (integerPart === 2) text = curr.mainDual
  else if (integerPart >= 3 && integerPart <= 10) text += ` ${curr.mainPlural}`
  else text += ` ${curr.mainSingle}`

  if (decimalPart > 0) {
    const decimalText = convertGroup(decimalPart)
    text += ` و${decimalText} ${curr.subSingle}`
  }

  return `${isNegative ? 'سالب ' : ''}فقط ${text} لا غير`
}
