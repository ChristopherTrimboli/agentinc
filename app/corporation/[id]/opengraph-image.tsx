import { ImageResponse } from "next/og";
import prisma from "@/lib/prisma";

export const alt = "Corporation | Agent Inc.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface CorpData {
  name: string;
  description: string | null;
  tokenSymbol: string | null;
  color: string | null;
  agents: { name: string; imageUrl: string | null }[];
}

const logoData = fetch(
  new URL("../../../public/agentinc.jpg", import.meta.url),
).then((res) => res.arrayBuffer());

async function fetchCorpData(
  id: string,
): Promise<{ corp: CorpData; agentImages: (ArrayBuffer | null)[] } | null> {
  try {
    const corp = await prisma.corporation.findUnique({
      where: { id },
      select: {
        name: true,
        description: true,
        tokenSymbol: true,
        logo: true,
        color: true,
        agents: {
          select: { name: true, imageUrl: true },
          take: 4,
        },
      },
    });

    if (!corp) return null;

    const agentImages = await Promise.all(
      corp.agents.map(async (agent) => {
        if (!agent.imageUrl) return null;
        try {
          const res = await fetch(agent.imageUrl);
          return res.ok ? await res.arrayBuffer() : null;
        } catch {
          return null;
        }
      }),
    );

    return { corp, agentImages };
  } catch (error) {
    console.error("[Corp OG Image] Error fetching data:", error);
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
        AI Corporation
      </div>
    </div>,
    { ...size },
  );
}

function renderCorp(
  corp: CorpData,
  agentImages: (ArrayBuffer | null)[],
  logo: ArrayBuffer,
) {
  const accentColor = corp.color || "#6FEC06";

  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#0a0520",
        backgroundImage: `radial-gradient(ellipse 70% 50% at 50% -10%, ${accentColor}18 0%, transparent 60%), radial-gradient(ellipse 50% 40% at 80% 100%, rgba(18, 5, 87, 0.3) 0%, transparent 50%)`,
        padding: "60px 70px",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `linear-gradient(${accentColor}08 1px, transparent 1px), linear-gradient(90deg, ${accentColor}08 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
          display: "flex",
        }}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 32,
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

        {corp.tokenSymbol && (
          <div
            style={{
              backgroundColor: `${accentColor}18`,
              border: `1px solid ${accentColor}40`,
              borderRadius: 999,
              padding: "8px 20px",
              fontSize: 20,
              fontWeight: 700,
              color: accentColor,
              display: "flex",
            }}
          >
            ${corp.tokenSymbol}
          </div>
        )}
      </div>

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
            fontSize: 64,
            fontWeight: 900,
            color: "white",
            lineHeight: 1.1,
            marginBottom: 16,
            display: "flex",
          }}
        >
          {corp.name}
        </div>

        {corp.description && (
          <div
            style={{
              fontSize: 24,
              color: "rgba(255, 255, 255, 0.5)",
              lineHeight: 1.4,
              display: "flex",
              maxWidth: 700,
            }}
          >
            {corp.description.slice(0, 140)}
            {corp.description.length > 140 ? "..." : ""}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        {corp.agents.map((agent, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                border: `2px solid ${accentColor}40`,
                backgroundColor: `${accentColor}10`,
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
                    color: `${accentColor}50`,
                  }}
                >
                  🤖
                </div>
              )}
            </div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "rgba(255, 255, 255, 0.4)",
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
        ))}

        {corp.agents.length === 0 && (
          <div
            style={{
              fontSize: 18,
              color: "rgba(255, 255, 255, 0.3)",
              display: "flex",
            }}
          >
            No agents assigned yet
          </div>
        )}

        <div
          style={{
            marginLeft: "auto",
            fontSize: 18,
            color: "rgba(255, 255, 255, 0.3)",
            display: "flex",
          }}
        >
          agentinc.fun
        </div>
      </div>
    </div>,
    { ...size },
  );
}

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [result, logo] = await Promise.all([fetchCorpData(id), logoData]);

  if (!result) return renderFallback(logo);
  return renderCorp(result.corp, result.agentImages, logo);
}
