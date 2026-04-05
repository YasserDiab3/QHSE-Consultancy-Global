'use client'

import { CONTACT_INFO } from '@/lib/contact-info'
import { MessageCircle, PhoneCall } from 'lucide-react'

export default function FloatingContactButtons() {
  return (
    <div className="fixed bottom-6 right-4 z-[60] flex flex-col gap-3 md:bottom-8 md:right-6">
      <a
        href={CONTACT_INFO.whatsappUrl}
        target="_blank"
        rel="noreferrer"
        aria-label="WhatsApp"
        className="group flex h-14 w-14 items-center justify-center rounded-[22px] bg-[#25D366] text-white shadow-lg shadow-green-500/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-green-500/40"
      >
        <MessageCircle className="h-7 w-7 transition-transform duration-300 group-hover:scale-110" />
      </a>

      <a
        href={CONTACT_INFO.phoneUrl}
        aria-label="Call us"
        className="group flex h-14 w-14 items-center justify-center rounded-[22px] bg-[#3B82F6] text-white shadow-lg shadow-blue-500/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/40"
      >
        <PhoneCall className="h-7 w-7 transition-transform duration-300 group-hover:scale-110" />
      </a>
    </div>
  )
}
