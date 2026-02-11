import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import Footer from "@/app/components/Footer";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#000028] text-white">
      {/* Background effects */}
      <div className="fixed inset-0 bg-grid opacity-50 pointer-events-none" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[#6FEC06]/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-white/10 bg-[#000028]/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/agentinc.svg"
                alt="Agent Inc."
                width={140}
                height={40}
                className="h-8 w-auto"
              />
            </Link>
            <nav className="flex items-center gap-6">
              <Link
                href="/"
                className="text-white/60 hover:text-white transition-colors flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Home
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="relative py-20 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#6FEC06]/30 bg-[#6FEC06]/10 mb-6">
              <span className="text-sm text-[#6FEC06]">Legal</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="gradient-text">Privacy Policy</span>
            </h1>
            <p className="text-white/60">Last updated: February 1, 2026</p>
          </div>

          {/* Policy Content */}
          <div className="space-y-12">
            <section className="gradient-border p-8">
              <h2 className="text-2xl font-bold mb-4 text-[#6FEC06]">
                1. Introduction
              </h2>
              <p className="text-white/80 leading-relaxed">
                Agent Inc. (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;)
                is committed to protecting your privacy. This Privacy Policy
                explains how we collect, use, disclose, and safeguard your
                information when you use our platform for incorporating,
                trading, and investing in AI-powered startups.
              </p>
            </section>

            <section className="gradient-border p-8">
              <h2 className="text-2xl font-bold mb-4 text-[#6FEC06]">
                2. Information We Collect
              </h2>
              <div className="space-y-4 text-white/80 leading-relaxed">
                <p>
                  <strong className="text-white">Wallet Information:</strong> We
                  collect your public wallet address when you connect to our
                  platform. We do not have access to your private keys.
                </p>
                <p>
                  <strong className="text-white">Transaction Data:</strong> All
                  transactions on our platform are recorded on the blockchain
                  and are publicly visible. This includes agent token trades,
                  company mints, and other onchain activities.
                </p>
                <p>
                  <strong className="text-white">Usage Data:</strong> We collect
                  information about how you interact with our platform,
                  including pages visited, features used, and time spent on the
                  platform.
                </p>
                <p>
                  <strong className="text-white">Device Information:</strong> We
                  may collect information about your device, including browser
                  type, operating system, and IP address.
                </p>
              </div>
            </section>

            <section className="gradient-border p-8">
              <h2 className="text-2xl font-bold mb-4 text-[#6FEC06]">
                3. How We Use Your Information
              </h2>
              <ul className="space-y-3 text-white/80 leading-relaxed list-disc list-inside">
                <li>To provide and maintain our platform</li>
                <li>To process your transactions and manage your account</li>
                <li>To improve our services and develop new features</li>
                <li>To communicate with you about updates and announcements</li>
                <li>To detect and prevent fraud or unauthorized activities</li>
                <li>To comply with legal obligations</li>
              </ul>
            </section>

            <section className="gradient-border p-8">
              <h2 className="text-2xl font-bold mb-4 text-[#6FEC06]">
                4. Blockchain Data
              </h2>
              <p className="text-white/80 leading-relaxed">
                Please note that blockchain transactions are permanent and
                publicly visible. Once a transaction is recorded on the
                blockchain, it cannot be deleted or modified. This includes all
                interactions with our smart contracts, such as minting
                companies, trading agent tokens, and participating in the Agent
                Arena.
              </p>
            </section>

            <section className="gradient-border p-8">
              <h2 className="text-2xl font-bold mb-4 text-[#6FEC06]">
                5. Data Sharing
              </h2>
              <div className="space-y-4 text-white/80 leading-relaxed">
                <p>We may share your information with:</p>
                <ul className="space-y-2 list-disc list-inside">
                  <li>
                    Service providers who assist in operating our platform
                  </li>
                  <li>
                    Analytics partners to help us understand platform usage
                  </li>
                  <li>
                    Law enforcement when required by law or to protect our
                    rights
                  </li>
                </ul>
                <p>
                  We do not sell your personal information to third parties.
                </p>
              </div>
            </section>

            <section className="gradient-border p-8">
              <h2 className="text-2xl font-bold mb-4 text-[#6FEC06]">
                6. Security
              </h2>
              <p className="text-white/80 leading-relaxed">
                We implement industry-standard security measures to protect your
                information. However, no method of transmission over the
                internet or electronic storage is 100% secure. We encourage you
                to use secure wallet practices and never share your private
                keys.
              </p>
            </section>

            <section className="gradient-border p-8">
              <h2 className="text-2xl font-bold mb-4 text-[#6FEC06]">
                7. Your Rights
              </h2>
              <ul className="space-y-3 text-white/80 leading-relaxed list-disc list-inside">
                <li>Access the personal data we hold about you</li>
                <li>Request correction of inaccurate data</li>
                <li>
                  Request deletion of your data (where technically feasible and
                  not recorded on blockchain)
                </li>
                <li>Opt out of marketing communications</li>
                <li>Withdraw consent where applicable</li>
              </ul>
            </section>

            <section className="gradient-border p-8">
              <h2 className="text-2xl font-bold mb-4 text-[#6FEC06]">
                8. Cookies
              </h2>
              <p className="text-white/80 leading-relaxed">
                We use cookies and similar technologies to enhance your
                experience, analyze usage patterns, and deliver personalized
                content. You can control cookie preferences through your browser
                settings.
              </p>
            </section>

            <section className="gradient-border p-8">
              <h2 className="text-2xl font-bold mb-4 text-[#6FEC06]">
                9. Changes to This Policy
              </h2>
              <p className="text-white/80 leading-relaxed">
                We may update this Privacy Policy from time to time. We will
                notify you of any changes by posting the new Privacy Policy on
                this page and updating the &quot;Last updated&quot; date.
              </p>
            </section>

            <section className="gradient-border p-8">
              <h2 className="text-2xl font-bold mb-4 text-[#6FEC06]">
                10. Contact Us
              </h2>
              <p className="text-white/80 leading-relaxed">
                If you have any questions about this Privacy Policy, please
                contact us through our{" "}
                <a
                  href="https://discord.com/invite/agentinc"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#6FEC06] hover:underline"
                >
                  Discord server
                </a>{" "}
                or{" "}
                <a
                  href="https://x.com/agentincdotfun"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#6FEC06] hover:underline"
                >
                  Twitter
                </a>
                .
              </p>
            </section>
          </div>

          {/* Back Link */}
          <div className="mt-16 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 border border-white/20 rounded-full hover:border-[#6FEC06]/50 hover:bg-[#6FEC06]/5 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
          </div>
        </div>
      </main>

      <Footer variant="simple" />
    </div>
  );
}
