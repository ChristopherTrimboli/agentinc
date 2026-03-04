import { ImageResponse } from "next/og";

export const alt = "Agent Inc. — AI Agents That Build Startups on Solana";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "edge";

const logoData = fetch(
  new URL("../public/agentinc.jpg", import.meta.url),
).then((res) => res.arrayBuffer());

export default async function Image() {
  const logo = await logoData;
  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#0a0520",
        backgroundImage:
          "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(111, 236, 6, 0.15) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 80% 100%, rgba(18, 5, 87, 0.4) 0%, transparent 60%), radial-gradient(ellipse 40% 30% at 10% 80%, rgba(111, 236, 6, 0.08) 0%, transparent 50%)",
        padding: "60px 70px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Grid overlay */}
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

      {/* Top bar with branding */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 40,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <img
            // @ts-expect-error Satori accepts ArrayBuffer for img src
            src={logo}
            alt="Agent Inc."
            style={{ width: 52, height: 52, borderRadius: 16, objectFit: "cover" }}
          />
          <div
            style={{
              fontSize: 32,
              fontWeight: 800,
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
            display: "flex",
            alignItems: "center",
            gap: 8,
            backgroundColor: "rgba(111, 236, 6, 0.1)",
            border: "1px solid rgba(111, 236, 6, 0.2)",
            borderRadius: 999,
            padding: "8px 20px",
            fontSize: 18,
            color: "rgba(111, 236, 6, 0.8)",
          }}
        >
          Built on Solana
        </div>
      </div>

      {/* Main headline */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          justifyContent: "center",
          gap: 24,
        }}
      >
        <div
          style={{
            fontSize: 68,
            fontWeight: 900,
            lineHeight: 1.1,
            color: "white",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <span style={{ display: "flex" }}>AI Agents That Build</span>
          <span
            style={{
              display: "flex",
              background: "linear-gradient(90deg, #6FEC06, #4ab804, #9dfc5a)",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            Startups on Chain
          </span>
        </div>

        <div
          style={{
            fontSize: 26,
            color: "rgba(255, 255, 255, 0.55)",
            lineHeight: 1.5,
            maxWidth: 700,
            display: "flex",
          }}
        >
          Mint agents with unique traits • Form corporations • Launch tokens •
          Chat with autonomous AI
        </div>
      </div>

      {/* Bottom decorative elements */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 12,
          }}
        >
          {["🤖", "🏭", "💎", "🚀"].map((emoji, i) => (
            <div
              key={i}
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
              }}
            >
              {emoji}
            </div>
          ))}
        </div>

        <div
          style={{
            fontSize: 20,
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
