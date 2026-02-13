import { ImageResponse } from "next/og";
import prisma from "@/lib/prisma";

// Image metadata
export const alt = "Agent Profile | Agent Inc.";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

// Generate the OG image
export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  try {
    // Fetch agent data (try both ID and tokenMint)
    const [agentById, agentByMint] = await Promise.all([
      prisma.agent.findUnique({
        where: { id },
        select: {
          name: true,
          description: true,
          tokenSymbol: true,
          imageUrl: true,
          rarity: true,
          isPublic: true,
        },
      }),
      prisma.agent.findUnique({
        where: { tokenMint: id },
        select: {
          name: true,
          description: true,
          tokenSymbol: true,
          imageUrl: true,
          rarity: true,
          isPublic: true,
        },
      }),
    ]);

    const agent = agentById || agentByMint;

    if (!agent || !agent.isPublic) {
      // Fallback to default Agent Inc. OG image
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
          }}
        >
          <div
            style={{
              fontSize: 80,
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
              fontSize: 32,
              color: "rgba(255, 255, 255, 0.6)",
              marginTop: 20,
              display: "flex",
            }}
          >
            AI-Powered Autonomous Startups
          </div>
        </div>,
        {
          ...size,
        },
      );
    }

    // Rarity colors
    const rarityColors: Record<
      string,
      { border: string; bg: string; glow: string }
    > = {
      common: {
        border: "rgba(107, 114, 128, 0.3)",
        bg: "rgba(107, 114, 128, 0.1)",
        glow: "rgba(107, 114, 128, 0.2)",
      },
      rare: {
        border: "rgba(59, 130, 246, 0.5)",
        bg: "rgba(59, 130, 246, 0.15)",
        glow: "rgba(59, 130, 246, 0.3)",
      },
      epic: {
        border: "rgba(168, 85, 247, 0.5)",
        bg: "rgba(168, 85, 247, 0.15)",
        glow: "rgba(168, 85, 247, 0.3)",
      },
      legendary: {
        border: "rgba(251, 191, 36, 0.6)",
        bg: "rgba(251, 191, 36, 0.15)",
        glow: "rgba(251, 191, 36, 0.4)",
      },
      mythic: {
        border: "rgba(244, 63, 94, 0.6)",
        bg: "rgba(244, 63, 94, 0.15)",
        glow: "rgba(244, 63, 94, 0.4)",
      },
    };

    const rarityStyle =
      rarityColors[agent.rarity || "common"] || rarityColors.common;

    // Fetch agent image if available
    let agentImageData: ArrayBuffer | null = null;
    if (agent.imageUrl) {
      try {
        const imageResponse = await fetch(agent.imageUrl);
        if (imageResponse.ok) {
          agentImageData = await imageResponse.arrayBuffer();
        }
      } catch (error) {
        console.error("[OG Image] Failed to fetch agent image:", error);
      }
    }

    return new ImageResponse(
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "#0a0520",
          backgroundImage:
            "radial-gradient(circle at 25% 25%, rgba(111, 236, 6, 0.1) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(18, 5, 87, 0.2) 0%, transparent 50%)",
          padding: 60,
        }}
      >
        {/* Left side - Agent Image */}
        <div
          style={{
            width: 400,
            height: 400,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 60,
            borderRadius: 32,
            border: `3px solid ${rarityStyle.border}`,
            backgroundColor: rarityStyle.bg,
            boxShadow: `0 0 60px ${rarityStyle.glow}`,
            overflow: "hidden",
          }}
        >
          {agentImageData ? (
            <img
              // @ts-expect-error Satori accepts ArrayBuffer for img src
              src={agentImageData}
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
                display: "flex",
                fontSize: 120,
                color: "rgba(111, 236, 6, 0.3)",
              }}
            >
              🤖
            </div>
          )}
        </div>

        {/* Right side - Agent Info */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          {/* Token Symbol Badge */}
          {agent.tokenSymbol && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  backgroundColor: "rgba(111, 236, 6, 0.15)",
                  border: "2px solid rgba(111, 236, 6, 0.3)",
                  borderRadius: 999,
                  padding: "8px 20px",
                  fontSize: 24,
                  fontWeight: 700,
                  color: "#6FEC06",
                  display: "flex",
                }}
              >
                ${agent.tokenSymbol}
              </div>
            </div>
          )}

          {/* Agent Name */}
          <div
            style={{
              fontSize: 72,
              fontWeight: 900,
              color: "white",
              lineHeight: 1.1,
              marginBottom: 20,
              display: "flex",
            }}
          >
            {agent.name}
          </div>

          {/* Description */}
          {agent.description && (
            <div
              style={{
                fontSize: 28,
                color: "rgba(255, 255, 255, 0.7)",
                lineHeight: 1.4,
                display: "flex",
                maxWidth: "100%",
              }}
            >
              {agent.description.slice(0, 120)}
              {agent.description.length > 120 ? "..." : ""}
            </div>
          )}

          {/* Footer */}
          <div
            style={{
              marginTop: 40,
              display: "flex",
              alignItems: "center",
            }}
          >
            <div
              style={{
                fontSize: 24,
                fontWeight: 700,
                background: "linear-gradient(to right, #6FEC06, #4ab804)",
                backgroundClip: "text",
                color: "transparent",
                display: "flex",
              }}
            >
              Agent Inc.
            </div>
            <div
              style={{
                marginLeft: 20,
                fontSize: 20,
                color: "rgba(255, 255, 255, 0.4)",
                display: "flex",
              }}
            >
              agentinc.fun
            </div>
          </div>
        </div>
      </div>,
      {
        ...size,
      },
    );
  } catch (error) {
    console.error("[OG Image] Error generating image:", error);

    // Fallback error image
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
        }}
      >
        <div
          style={{
            fontSize: 80,
            fontWeight: 900,
            background: "linear-gradient(to bottom right, #6FEC06, #4ab804)",
            backgroundClip: "text",
            color: "transparent",
            display: "flex",
          }}
        >
          Agent Inc.
        </div>
      </div>,
      {
        ...size,
      },
    );
  }
}
