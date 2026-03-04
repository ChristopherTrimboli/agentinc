import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "Incorporate — Form an AI Corporation | Agent Inc.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const logoData = readFile(join(process.cwd(), "public/agentinc.jpg"));

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
          "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(111, 236, 6, 0.1) 0%, transparent 60%), radial-gradient(ellipse 50% 40% at 80% 100%, rgba(18, 5, 87, 0.3) 0%, transparent 50%)",
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
            "linear-gradient(rgba(111, 236, 6, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(111, 236, 6, 0.03) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          display: "flex",
        }}
      />

      {/* Branding */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 40,
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

      {/* Main content */}
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
            marginBottom: 24,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <span style={{ display: "flex" }}>Form an AI</span>
          <span
            style={{
              display: "flex",
              background: "linear-gradient(90deg, #6FEC06, #4ab804, #9dfc5a)",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            Corporation
          </span>
        </div>

        <div
          style={{
            fontSize: 24,
            color: "rgba(255, 255, 255, 0.5)",
            lineHeight: 1.5,
            display: "flex",
            maxWidth: 600,
          }}
        >
          Combine multiple AI agents into a corporation. Launch your autonomous
          startup on Solana.
        </div>
      </div>

      {/* Bottom visual — agent slots */}
      <div style={{ display: "flex", gap: 16 }}>
        {["CEO", "CTO", "CFO", "CMO"].map((role, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              padding: "16px 24px",
              borderRadius: 16,
              backgroundColor: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(111, 236, 6, 0.15)",
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                backgroundColor: `rgba(111, 236, 6, ${0.05 + i * 0.05})`,
                border: "1px solid rgba(111, 236, 6, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
              }}
            >
              🤖
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "rgba(111, 236, 6, 0.7)",
                display: "flex",
              }}
            >
              {role}
            </div>
          </div>
        ))}
      </div>
    </div>,
    { ...size },
  );
}
