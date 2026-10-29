/**
 * Centralized Firm & Branding Configuration
 * Used for Invoices, Statements of Account, Audit Reports, and official prints.
 */

export interface CompanyBankConfig {
  bankName: string
  accountName: string
  iban: string
  accountNumber: string
  swiftCode?: string
}

export interface CompanyProfileConfig {
  nameAr: string
  nameEn: string
  subtitleAr: string
  subtitleEn: string
  commercialReg: string // س.ت
  taxId: string // ب.ض
  civilDefenseReg: string // اعتماد الدفاع المدني
  phone: string
  email: string
  addressAr: string
  addressEn: string
  website: string
  bank: CompanyBankConfig
}

export const DEFAULT_COMPANY_CONFIG: CompanyProfileConfig = {
  nameAr: 'جلوبال لاستشارات السلامة والصحة المهنية والبيئة',
  nameEn: 'Global for Occupational Health, Safety & Environmental Consultations',
  subtitleAr: 'خدمات استشارية وهندسية وتدريبية متكاملة وفقاً لمعايير الأوشا والأيزو والدفاع المدني',
  subtitleEn: 'QHSSE Consulting, Engineering & Training Services',
  commercialReg: '104820',
  taxId: '549-812-701',
  civilDefenseReg: '412',
  phone: '01117755096',
  email: 'info@hsehub360.com',
  addressAr: 'كايرو بيزنس بارك - التجمع الخامس - القاهرة',
  addressEn: 'Cairo Business Park, New Cairo, Egypt',
  website: 'www.hsehub360.com',
  bank: {
    bankName: 'البنك التجاري الدولي (CIB)',
    accountName: 'جلوبال للاستشارات',
    iban: 'EG380004000100045892147001',
    accountNumber: '100045892147',
    swiftCode: 'CIBEEGCA',
  },
}
