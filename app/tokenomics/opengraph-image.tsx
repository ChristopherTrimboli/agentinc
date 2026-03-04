import { ImageResponse } from "next/og";

export const alt = "$AGENT Tokenomics | Agent Inc.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "edge";

const logoData = fetch(
  new URL("../../public/agentinc.jpg", import.meta.url),
).then((res) => res.arrayBuffer());

export default async function Image() {
  const logo = await logoData;
  const slices = [
    { label: "Community", pct: 40, color: "#8B5CF6" },
    { label: "Liquidity", pct: 25, color: "#06B6D4" },
    { label: "Treasury", pct: 15, color: "#10B981" },
    { label: "Team", pct: 10, color: "#F59E0B" },
    { label: "Grants", pct: 10, color: "#EC4899" },
  ];

  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "row",
        backgroundColor: "#0a0520",
        backgroundImage:
          "radial-gradient(ellipse 60% 50% at 20% 50%, rgba(139, 92, 246, 0.12) 0%, transparent 60%), radial-gradient(ellipse 50% 40% at 80% 80%, rgba(6, 182, 212, 0.1) 0%, transparent 50%)",
        padding: "60px 70px",
        position: "relative",
      }}
    >
      {/* Grid overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(139, 92, 246, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(139, 92, 246, 0.03) 1px, transparent 1px)",
          backgroundSize: "50px 50px",
          display: "flex",
        }}
      />

      {/* Left side — info */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          paddingRight: 40,
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
            fontSize: 56,
            fontWeight: 900,
            color: "white",
            lineHeight: 1.1,
            marginBottom: 16,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <span
            style={{
              display: "flex",
              background: "linear-gradient(90deg, #8B5CF6, #06B6D4, #10B981)",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            $AGENT
          </span>
          <span style={{ display: "flex" }}>Tokenomics</span>
        </div>

        <div
          style={{
            fontSize: 22,
            color: "rgba(255, 255, 255, 0.5)",
            lineHeight: 1.5,
            display: "flex",
            marginBottom: 32,
          }}
        >
          1B supply • Creator-first fee model • Staking rewards
        </div>

        {/* Key metrics */}
        <div style={{ display: "flex", gap: 20 }}>
          {[
            { value: "50%", label: "Creator Royalties", color: "#8B5CF6" },
            { value: "25%", label: "Staker Rewards", color: "#06B6D4" },
            { value: "10%", label: "Burn Rate", color: "#F59E0B" },
          ].map((m, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "12px 16px",
                borderRadius: 12,
                backgroundColor: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  color: m.color,
                  display: "flex",
                }}
              >
                {m.value}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "rgba(255, 255, 255, 0.4)",
                  display: "flex",
                }}
              >
                {m.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right side — visual distribution */}
      <div
        style={{
          width: 380,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: 16,
        }}
      >
        {slices.map((s, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              width: "100%",
            }}
          >
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: 4,
                backgroundColor: s.color,
                display: "flex",
                flexShrink: 0,
              }}
            />
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 18,
                }}
              >
                <span
                  style={{
                    color: "rgba(255, 255, 255, 0.7)",
                    display: "flex",
                  }}
                >
                  {s.label}
                </span>
                <span
                  style={{
                    color: s.color,
                    fontWeight: 700,
                    display: "flex",
                  }}
                >
                  {s.pct}%
                </span>
              </div>
              <div
                style={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                  display: "flex",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${s.pct * 2.5}%`,
                    height: "100%",
                    borderRadius: 4,
                    background: `linear-gradient(90deg, ${s.color}, ${s.color}88)`,
                    display: "flex",
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>,
    { ...size },
  );
}
