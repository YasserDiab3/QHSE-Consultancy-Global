import Header from '@/components/Header'
import Footer from '@/components/Footer'
import LegalPage from '@/components/LegalPage'
import { privacyPolicy } from '@/lib/legal-content'

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main id="legal-main">
        <LegalPage document={privacyPolicy} />
      </main>
      <Footer />
    </div>
  )
}
