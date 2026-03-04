import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import prisma from "@/lib/prisma";

export const alt = "User Profile | Agent Inc.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface AgentData {
  name: string;
  imageUrl: string | null;
  rarity: string | null;
}

const RARITY_COLORS: Record<string, string> = {
  common: "#6B7280",
  rare: "#3B82F6",
  epic: "#A855F7",
  legendary: "#FBBF24",
  mythic: "#F43F5E",
};

const logoData = readFile(join(process.cwd(), "public/agentinc.jpg"));

async function fetchProfileData(wallet: string): Promise<{
  agents: AgentData[];
  agentImages: (ArrayBuffer | null)[];
} | null> {
  try {
    const agents = await prisma.agent.findMany({
      where: {
        createdBy: {
          wallets: { some: { address: wallet } },
        },
        isPublic: true,
      },
      select: { name: true, imageUrl: true, rarity: true },
      take: 5,
      orderBy: { createdAt: "desc" },
    });

    const agentImages = await Promise.all(
      agents.map(async (agent) => {
        if (!agent.imageUrl) return null;
        try {
          const res = await fetch(agent.imageUrl);
          return res.ok ? await res.arrayBuffer() : null;
        } catch {
          return null;
        }
      }),
    );

    return { agents, agentImages };
  } catch (error) {
    console.error("[Profile OG Image] Error fetching data:", error);
    return null;
  }
}

function renderFallback(logo: ArrayBuffer) {
  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#0a0520",
        backgroundImage:
          "radial-gradient(circle at 25% 25%, rgba(111, 236, 6, 0.15) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(18, 5, 87, 0.3) 0%, transparent 50%)",
        gap: 24,
      }}
    >
      <img
        // @ts-expect-error Satori accepts ArrayBuffer for img src
        src={logo}
        alt="Agent Inc."
        style={{
          width: 120,
          height: 120,
          borderRadius: 28,
          objectFit: "cover",
        }}
      />
      <div
        style={{
          fontSize: 64,
          fontWeight: 900,
          background: "linear-gradient(to bottom right, #6FEC06, #4ab804)",
          backgroundClip: "text",
          color: "transparent",
          display: "flex",
        }}
      >
        Agent Inc.
      </div>
      <div
        style={{
          fontSize: 28,
          color: "rgba(255, 255, 255, 0.5)",
          display: "flex",
        }}
      >
        User Profile
      </div>
    </div>,
    { ...size },
  );
}

function renderProfile(
  wallet: string,
  agents: AgentData[],
  agentImages: (ArrayBuffer | null)[],
  logo: ArrayBuffer,
) {
  const shortWallet = `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;

  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#0a0520",
        backgroundImage:
          "radial-gradient(ellipse 70% 50% at 30% 0%, rgba(111, 236, 6, 0.08) 0%, transparent 60%), radial-gradient(ellipse 50% 40% at 80% 100%, rgba(18, 5, 87, 0.25) 0%, transparent 50%)",
        padding: "60px 70px",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(111, 236, 6, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(111, 236, 6, 0.03) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          display: "flex",
        }}
      />

      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 40,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img
            // @ts-expect-error Satori accepts ArrayBuffer for img src
            src={logo}
            alt="Agent Inc."
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              objectFit: "cover",
            }}
          />
          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              background: "linear-gradient(to right, #6FEC06, #9dfc5a)",
              backgroundClip: "text",
              color: "transparent",
              display: "flex",
            }}
          >
            Agent Inc.
          </div>
        </div>

        <div
          style={{
            fontSize: 18,
            color: "rgba(255, 255, 255, 0.3)",
            display: "flex",
          }}
        >
          agentinc.fun
        </div>
      </div>

      {/* Profile info */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          justifyContent: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 24,
          }}
        >
          <img
            // @ts-expect-error Satori accepts ArrayBuffer for img src
            src={logo}
            alt="Profile"
            style={{
              width: 60,
              height: 60,
              borderRadius: 16,
              border: "2px solid rgba(111, 236, 6, 0.2)",
              objectFit: "cover",
            }}
          />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontSize: 18,
                color: "rgba(255, 255, 255, 0.4)",
                display: "flex",
              }}
            >
              Solana Wallet
            </div>
            <div
              style={{
                fontSize: 36,
                fontWeight: 800,
                color: "white",
                display: "flex",
              }}
            >
              {shortWallet}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 24, marginBottom: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 16px",
              borderRadius: 12,
              backgroundColor: "rgba(111, 236, 6, 0.08)",
              border: "1px solid rgba(111, 236, 6, 0.15)",
            }}
          >
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: "#6FEC06",
                display: "flex",
              }}
            >
              {agents.length}
            </div>
            <div
              style={{
                fontSize: 16,
                color: "rgba(255, 255, 255, 0.4)",
                display: "flex",
              }}
            >
              Agent{agents.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>
      </div>

      {/* Agent gallery */}
      {agents.length > 0 && (
        <div style={{ display: "flex", gap: 16 }}>
          {agents.map((agent, i) => {
            const borderColor =
              RARITY_COLORS[agent.rarity || "common"] || RARITY_COLORS.common;
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 14,
                    border: `2px solid ${borderColor}60`,
                    backgroundColor: `${borderColor}15`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                  }}
                >
                  {agentImages[i] ? (
                    <img
                      // @ts-expect-error Satori accepts ArrayBuffer for img src
                      src={agentImages[i]}
                      alt={agent.name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        fontSize: 28,
                        display: "flex",
                        color: `${borderColor}50`,
                      }}
                    >
                      🤖
                    </div>
                  )}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "rgba(255, 255, 255, 0.5)",
                    display: "flex",
                    maxWidth: 80,
                    textAlign: "center",
                  }}
                >
                  {agent.name.length > 10
                    ? agent.name.slice(0, 10) + "..."
                    : agent.name}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>,
    { ...size },
  );
}

export default async function Image({
  params,
}: {
  params: Promise<{ wallet: string }>;
}) {
  const { wallet } = await params;
  const [result, logo] = await Promise.all([
    fetchProfileData(wallet),
    logoData,
  ]);

  if (!result) return renderFallback(logo);
  return renderProfile(wallet, result.agents, result.agentImages, logo);
}
