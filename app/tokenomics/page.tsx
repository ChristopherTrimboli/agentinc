"use client";

import Link from "next/link";
import Footer from "@/app/components/Footer";

// Token Distribution Data
const tokenDistribution = [
  {
    label: "Community & Creators",
    percentage: 40,
    color: "#8B5CF6",
    description: "Rewards for creators, stakers, and active participants",
  },
  {
    label: "Liquidity Pool",
    percentage: 25,
    color: "#06B6D4",
    description: "DEX liquidity and pump.fun launches",
  },
  {
    label: "Treasury",
    percentage: 15,
    color: "#10B981",
    description: "Platform development and operations",
  },
  {
    label: "Team & Advisors",
    percentage: 10,
    color: "#F59E0B",
    description: "Vested over 2 years with 6-month cliff",
  },
  {
    label: "Ecosystem Grants",
    percentage: 10,
    color: "#EC4899",
    description: "Developer incentives and partnerships",
  },
];

// Creator Fee Structure
const creatorFees = [
  {
    action: "Company Mint",
    fee: "2.5%",
    creatorShare: "50%",
    description: "When users mint a new AI company",
  },
  {
    action: "Agent Token Trade",
    fee: "1%",
    creatorShare: "40%",
    description: "Secondary market trades on pump.fun",
  },
  {
    action: "Agent Task Revenue",
    fee: "5%",
    creatorShare: "60%",
    description: "Revenue from AI agent services",
  },
  {
    action: "Company Acquisition",
    fee: "3%",
    creatorShare: "50%",
    description: "When companies are bought/sold",
  },
];

// Fee Distribution
const feeDistribution = [
  { recipient: "Original Creator", share: "50%", color: "#8B5CF6" },
  { recipient: "Token Holders (Stakers)", share: "25%", color: "#06B6D4" },
  { recipient: "Platform Treasury", share: "15%", color: "#10B981" },
  { recipient: "Burn", share: "10%", color: "#F59E0B" },
];

function PieChart({ data }: { data: typeof tokenDistribution }) {
  const createSlicePath = (percentage: number, startPercentage: number) => {
    const startAngle = (startPercentage / 100) * 360 - 90;
    const endAngle = ((startPercentage + percentage) / 100) * 360 - 90;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = 100 + 80 * Math.cos(startRad);
    const y1 = 100 + 80 * Math.sin(startRad);
    const x2 = 100 + 80 * Math.cos(endRad);
    const y2 = 100 + 80 * Math.sin(endRad);

    const largeArcFlag = percentage > 50 ? 1 : 0;

    return `M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
  };

  return (
    <svg
      viewBox="0 0 200 200"
      className="w-full max-w-[300px] mx-auto drop-shadow-2xl"
    >
      {
        data.reduce<{ elements: React.ReactElement[]; cumulative: number }>(
          (acc, item, index) => {
            const path = createSlicePath(item.percentage, acc.cumulative);
            acc.elements.push(
              <path
                key={index}
                d={path}
                fill={item.color}
                className="transition-all duration-300 hover:opacity-80 cursor-pointer"
                style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" }}
              />,
            );
            acc.cumulative += item.percentage;
            return acc;
          },
          { elements: [], cumulative: 0 },
        ).elements
      }
      <circle cx="100" cy="100" r="40" fill="#0a0a0a" />
      <text
        x="100"
        y="95"
        textAnchor="middle"
        className="fill-white text-xs font-bold"
      >
        $AGENT
      </text>
      <text
        x="100"
        y="110"
        textAnchor="middle"
        className="fill-gray-400 text-[8px]"
      >
        1B Supply
      </text>
    </svg>
  );
}

function FeeFlowDiagram() {
  return (
    <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 border border-gray-700">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-violet-500/20 border border-violet-500/50 rounded-full px-4 py-2">
          <span className="text-violet-400 font-semibold">
            Platform Activity
          </span>
        </div>
      </div>

      <div className="flex justify-center mb-6">
        <svg
          className="w-6 h-12 text-violet-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        </svg>
      </div>

      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-cyan-500/20 border border-cyan-500/50 rounded-full px-4 py-2">
          <span className="text-cyan-400 font-semibold">Fee Pool</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {feeDistribution.map((item, index) => (
          <div key={index} className="text-center">
            <div
              className="w-16 h-16 mx-auto rounded-full flex items-center justify-center text-white font-bold mb-2"
              style={{ backgroundColor: item.color }}
            >
              {item.share}
            </div>
            <p className="text-sm text-gray-300">{item.recipient}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TokenomicsPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-black/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl">🤖</span>
              <span className="font-bold text-xl">Agent Inc.</span>
            </Link>
            <nav className="flex items-center gap-6">
              <Link
                href="/"
                className="text-gray-400 hover:text-white transition-colors"
              >
                Home
              </Link>
              <Link
                href="/tokenomics"
                className="text-violet-400 font-semibold"
              >
                Tokenomics
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/30 rounded-full px-4 py-2 mb-6">
            <span className="text-violet-400 text-sm font-medium">
              $AGENT Token Economics
            </span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            <span className="bg-gradient-to-r from-violet-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              Tokenomics
            </span>
          </h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            A creator-first token model where fees flow back to the community.
            Build AI companies, earn rewards, and share in the network&apos;s
            success.
          </p>
        </div>
      </section>

      {/* Token Distribution */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Token Distribution
            </h2>
            <p className="text-gray-400">Total Supply: 1,000,000,000 $AGENT</p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <PieChart data={tokenDistribution} />

            <div className="space-y-4">
              {tokenDistribution.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 p-4 rounded-xl bg-gray-900/50 border border-gray-800 hover:border-gray-700 transition-colors"
                >
                  <div
                    className="w-4 h-4 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{item.label}</span>
                      <span
                        className="text-lg font-bold"
                        style={{ color: item.color }}
                      >
                        {item.percentage}%
                      </span>
                    </div>
                    <p className="text-sm text-gray-400">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Creator Fee Structure */}
      <section className="py-16 px-4 bg-gradient-to-b from-transparent via-violet-950/20 to-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-4 py-2 mb-6">
              <span className="text-emerald-400 text-sm font-medium">
                Creator Rewards
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Creator Fee Structure
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Creators earn ongoing royalties from their AI companies and
              agents. Every transaction generates fees that flow back to
              original creators.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {creatorFees.map((item, index) => (
              <div
                key={index}
                className="p-6 rounded-2xl bg-gray-900/50 border border-gray-800 hover:border-violet-500/50 transition-all group"
              >
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-xl font-bold group-hover:text-violet-400 transition-colors">
                    {item.action}
                  </h3>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-cyan-400">
                      {item.fee}
                    </div>
                    <div className="text-sm text-gray-500">platform fee</div>
                  </div>
                </div>
                <p className="text-gray-400 mb-4">{item.description}</p>
                <div className="flex items-center gap-2 text-emerald-400">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="font-semibold">
                    {item.creatorShare} goes to creator
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Fee Flow Diagram */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Fee Distribution Flow
            </h2>
            <p className="text-gray-400">
              How platform fees are distributed across the ecosystem
            </p>
          </div>
          <FeeFlowDiagram />
        </div>
      </section>

      {/* Key Metrics */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center p-6 rounded-2xl bg-gradient-to-br from-violet-500/10 to-transparent border border-violet-500/30">
              <div className="text-4xl font-bold text-violet-400 mb-2">50%</div>
              <div className="font-semibold mb-1">Creator Royalties</div>
              <div className="text-sm text-gray-500">of all fees</div>
            </div>
            <div className="text-center p-6 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-transparent border border-cyan-500/30">
              <div className="text-4xl font-bold text-cyan-400 mb-2">25%</div>
              <div className="font-semibold mb-1">Holder Rewards</div>
              <div className="text-sm text-gray-500">to stakers</div>
            </div>
            <div className="text-center p-6 rounded-2xl bg-gradient-to-br from-orange-500/10 to-transparent border border-orange-500/30">
              <div className="text-4xl font-bold text-orange-400 mb-2">10%</div>
              <div className="font-semibold mb-1">Deflationary</div>
              <div className="text-sm text-gray-500">burn rate</div>
            </div>
            <div className="text-center p-6 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/30">
              <div className="text-4xl font-bold text-emerald-400 mb-2">1B</div>
              <div className="font-semibold mb-1">Max Supply</div>
              <div className="text-sm text-gray-500">$AGENT tokens</div>
            </div>
          </div>
        </div>
      </section>

      {/* Staking Benefits */}
      <section className="py-16 px-4 bg-gradient-to-b from-transparent via-cyan-950/20 to-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Staking Benefits
            </h2>
            <p className="text-gray-400">
              Lock $AGENT to earn platform rewards and governance rights
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: "Revenue Share",
                description:
                  "Earn 25% of all platform fees distributed proportionally to your stake",
                icon: "💰",
              },
              {
                title: "Governance",
                description:
                  "Vote on protocol upgrades, fee structures, and treasury allocation",
                icon: "🗳️",
              },
              {
                title: "Premium Features",
                description:
                  "Access exclusive agent templates, priority minting, and reduced fees",
                icon: "⭐",
              },
            ].map((benefit, index) => (
              <div
                key={index}
                className="p-6 rounded-2xl bg-gray-900/50 border border-gray-800 hover:border-cyan-500/50 transition-all"
              >
                <div className="text-4xl mb-4">{benefit.icon}</div>
                <h3 className="text-xl font-bold mb-2">{benefit.title}</h3>
                <p className="text-gray-400">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Vesting Schedule */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Vesting Schedule
            </h2>
            <p className="text-gray-400">
              Team and advisor tokens are locked to ensure long-term alignment
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-4 px-4 text-gray-400 font-medium">
                    Allocation
                  </th>
                  <th className="text-left py-4 px-4 text-gray-400 font-medium">
                    Cliff
                  </th>
                  <th className="text-left py-4 px-4 text-gray-400 font-medium">
                    Vesting
                  </th>
                  <th className="text-left py-4 px-4 text-gray-400 font-medium">
                    TGE Unlock
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    allocation: "Community & Creators",
                    cliff: "None",
                    vesting: "Continuous rewards",
                    tge: "100%",
                  },
                  {
                    allocation: "Liquidity Pool",
                    cliff: "None",
                    vesting: "Locked in DEX",
                    tge: "100%",
                  },
                  {
                    allocation: "Treasury",
                    cliff: "None",
                    vesting: "Governance controlled",
                    tge: "20%",
                  },
                  {
                    allocation: "Team & Advisors",
                    cliff: "6 months",
                    vesting: "24 months linear",
                    tge: "0%",
                  },
                  {
                    allocation: "Ecosystem Grants",
                    cliff: "None",
                    vesting: "Milestone-based",
                    tge: "10%",
                  },
                ].map((row, index) => (
                  <tr
                    key={index}
                    className="border-b border-gray-800/50 hover:bg-gray-900/30"
                  >
                    <td className="py-4 px-4 font-medium">{row.allocation}</td>
                    <td className="py-4 px-4 text-gray-400">{row.cliff}</td>
                    <td className="py-4 px-4 text-gray-400">{row.vesting}</td>
                    <td className="py-4 px-4">
                      <span className="px-3 py-1 rounded-full bg-violet-500/20 text-violet-400 text-sm">
                        {row.tge}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Build?
          </h2>
          <p className="text-xl text-gray-400 mb-8">
            Create your first AI company and start earning creator rewards
            today.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/"
              className="px-8 py-4 bg-gradient-to-r from-violet-600 to-cyan-600 rounded-xl font-semibold hover:opacity-90 transition-opacity"
            >
              Launch App
            </Link>
            <a
              href="https://x.com/agentincdotfun"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 bg-gray-800 rounded-xl font-semibold hover:bg-gray-700 transition-colors"
            >
              Follow Updates
            </a>
          </div>
        </div>
      </section>

      <Footer variant="simple" />
    </div>
  );
}
