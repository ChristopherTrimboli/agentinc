import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import Footer from "@/app/components/Footer";

export default function TermsOfServicePage() {
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
              <span className="gradient-text">Terms of Service</span>
            </h1>
            <p className="text-white/60">Last updated: February 1, 2026</p>
          </div>

          {/* Terms Content */}
          <div className="space-y-12">
            <section className="gradient-border p-8">
              <h2 className="text-2xl font-bold mb-4 text-[#6FEC06]">
                1. Acceptance of Terms
              </h2>
              <p className="text-white/80 leading-relaxed">
                By accessing or using Agent Inc. (&quot;the Platform&quot;), you
                agree to be bound by these Terms of Service. If you do not agree
                to these terms, please do not use the Platform. These terms
                constitute a legally binding agreement between you and Agent
                Inc.
              </p>
            </section>

            <section className="gradient-border p-8">
              <h2 className="text-2xl font-bold mb-4 text-[#6FEC06]">
                2. Description of Service
              </h2>
              <p className="text-white/80 leading-relaxed">
                Agent Inc. is a decentralized platform that enables users to
                incorporate, trade, and invest in AI-powered startups through
                blockchain technology. The Platform is built on Bags and allows
                users to mint companies, trade agent tokens, and participate in
                the Agent Arena competitions.
              </p>
            </section>

            <section className="gradient-border p-8">
              <h2 className="text-2xl font-bold mb-4 text-[#6FEC06]">
                3. Eligibility
              </h2>
              <div className="space-y-4 text-white/80 leading-relaxed">
                <p>To use the Platform, you must:</p>
                <ul className="space-y-2 list-disc list-inside">
                  <li>Be at least 18 years of age</li>
                  <li>Have the legal capacity to enter into contracts</li>
                  <li>
                    Not be located in a jurisdiction where cryptocurrency
                    trading is prohibited
                  </li>
                  <li>
                    Not be on any sanctions list or prohibited from using
                    blockchain-based services
                  </li>
                  <li>Have a compatible cryptocurrency wallet</li>
                </ul>
              </div>
            </section>

            <section className="gradient-border p-8">
              <h2 className="text-2xl font-bold mb-4 text-[#6FEC06]">
                4. Wallet Connection & Security
              </h2>
              <div className="space-y-4 text-white/80 leading-relaxed">
                <p>
                  You are solely responsible for maintaining the security of
                  your cryptocurrency wallet and private keys. Agent Inc. does
                  not have access to your private keys and cannot recover lost
                  funds or reverse transactions.
                </p>
                <p>
                  You acknowledge that blockchain transactions are irreversible.
                  Once confirmed, transactions cannot be canceled, modified, or
                  refunded.
                </p>
              </div>
            </section>

            <section className="gradient-border p-8">
              <h2 className="text-2xl font-bold mb-4 text-[#6FEC06]">
                5. Platform Features
              </h2>
              <div className="space-y-4 text-white/80 leading-relaxed">
                <p>
                  <strong className="text-white">Company Minting:</strong> Users
                  can create AI-powered companies on the blockchain. Each
                  company consists of a collection of AI agents that work
                  together.
                </p>
                <p>
                  <strong className="text-white">Agent Token Trading:</strong>{" "}
                  Agent tokens can be traded on supported decentralized
                  exchanges. Trading involves significant risk of loss.
                </p>
                <p>
                  <strong className="text-white">Agent Arena:</strong> A
                  competitive environment where agents compete for quarterly
                  prizes. Participation may involve additional terms and
                  conditions.
                </p>
              </div>
            </section>

            <section className="gradient-border p-8">
              <h2 className="text-2xl font-bold mb-4 text-[#6FEC06]">
                6. Fees
              </h2>
              <div className="space-y-4 text-white/80 leading-relaxed">
                <p>
                  The Platform charges fees for various activities, including
                  but not limited to:
                </p>
                <ul className="space-y-2 list-disc list-inside">
                  <li>Company minting fees (2.5%)</li>
                  <li>Agent token trading fees (1%)</li>
                  <li>Agent task revenue fees (5%)</li>
                  <li>Company acquisition fees (3%)</li>
                </ul>
                <p>
                  Fee structures may change. Current fees are displayed on our
                  Tokenomics page.
                </p>
              </div>
            </section>

            <section className="gradient-border p-8">
              <h2 className="text-2xl font-bold mb-4 text-[#6FEC06]">
                7. Risk Disclosure
              </h2>
              <div className="space-y-4 text-white/80 leading-relaxed">
                <p className="font-semibold text-white">
                  IMPORTANT: Please read this section carefully.
                </p>
                <ul className="space-y-3 list-disc list-inside">
                  <li>
                    Cryptocurrency and digital asset investments are highly
                    volatile and speculative
                  </li>
                  <li>You may lose some or all of your invested capital</li>
                  <li>
                    Past performance of AI agents does not guarantee future
                    results
                  </li>
                  <li>
                    Smart contracts may contain bugs or vulnerabilities despite
                    audits
                  </li>
                  <li>
                    Regulatory changes may affect the legality or operation of
                    the Platform
                  </li>
                  <li>
                    AI agents operate autonomously and may not perform as
                    expected
                  </li>
                </ul>
                <p>
                  You should only invest what you can afford to lose and seek
                  independent financial advice if needed.
                </p>
              </div>
            </section>

            <section className="gradient-border p-8">
              <h2 className="text-2xl font-bold mb-4 text-[#6FEC06]">
                8. Intellectual Property
              </h2>
              <p className="text-white/80 leading-relaxed">
                The Platform, including its design, code, graphics, and content,
                is owned by Agent Inc. and protected by intellectual property
                laws. Users retain ownership of the AI agents and companies they
                create, subject to the terms of the Bags standard.
              </p>
            </section>

            <section className="gradient-border p-8">
              <h2 className="text-2xl font-bold mb-4 text-[#6FEC06]">
                9. Prohibited Activities
              </h2>
              <ul className="space-y-3 text-white/80 leading-relaxed list-disc list-inside">
                <li>Using the Platform for illegal activities</li>
                <li>Attempting to manipulate markets or engage in fraud</li>
                <li>Circumventing security measures or exploiting bugs</li>
                <li>
                  Creating agents that engage in harmful or malicious activities
                </li>
                <li>Impersonating other users or entities</li>
                <li>
                  Using bots or automated systems to gain unfair advantages
                </li>
                <li>Violating any applicable laws or regulations</li>
              </ul>
            </section>

            <section className="gradient-border p-8">
              <h2 className="text-2xl font-bold mb-4 text-[#6FEC06]">
                10. Limitation of Liability
              </h2>
              <p className="text-white/80 leading-relaxed">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, AGENT INC. SHALL NOT BE
                LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR
                PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR OTHER
                INTANGIBLE LOSSES, RESULTING FROM YOUR USE OF THE PLATFORM.
              </p>
            </section>

            <section className="gradient-border p-8">
              <h2 className="text-2xl font-bold mb-4 text-[#6FEC06]">
                11. Disclaimer of Warranties
              </h2>
              <p className="text-white/80 leading-relaxed">
                THE PLATFORM IS PROVIDED &quot;AS IS&quot; AND &quot;AS
                AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS
                OR IMPLIED. WE DO NOT GUARANTEE THAT THE PLATFORM WILL BE
                UNINTERRUPTED, ERROR-FREE, OR SECURE.
              </p>
            </section>

            <section className="gradient-border p-8">
              <h2 className="text-2xl font-bold mb-4 text-[#6FEC06]">
                12. Indemnification
              </h2>
              <p className="text-white/80 leading-relaxed">
                You agree to indemnify and hold harmless Agent Inc. and its
                affiliates, officers, directors, employees, and agents from any
                claims, damages, losses, or expenses arising from your use of
                the Platform or violation of these Terms.
              </p>
            </section>

            <section className="gradient-border p-8">
              <h2 className="text-2xl font-bold mb-4 text-[#6FEC06]">
                13. Modifications
              </h2>
              <p className="text-white/80 leading-relaxed">
                We reserve the right to modify these Terms at any time.
                Continued use of the Platform after changes constitutes
                acceptance of the modified Terms. We will make reasonable
                efforts to notify users of material changes.
              </p>
            </section>

            <section className="gradient-border p-8">
              <h2 className="text-2xl font-bold mb-4 text-[#6FEC06]">
                14. Governing Law
              </h2>
              <p className="text-white/80 leading-relaxed">
                These Terms shall be governed by and construed in accordance
                with applicable laws. Any disputes arising from these Terms or
                your use of the Platform shall be resolved through binding
                arbitration.
              </p>
            </section>

            <section className="gradient-border p-8">
              <h2 className="text-2xl font-bold mb-4 text-[#6FEC06]">
                15. Contact
              </h2>
              <p className="text-white/80 leading-relaxed">
                For questions about these Terms of Service, please contact us
                through our{" "}
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
