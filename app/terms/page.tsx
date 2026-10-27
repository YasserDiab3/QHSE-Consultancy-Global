import Header from '@/components/Header'
import Footer from '@/components/Footer'
import LegalPage from '@/components/LegalPage'
import { termsOfService } from '@/lib/legal-content'

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main id="legal-main">
        <LegalPage document={termsOfService} />
      </main>
      <Footer />
    </div>
  )
}
