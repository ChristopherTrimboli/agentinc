import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "8004 Network — AI Agent Registry | Agent Inc.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const logoData = readFile(join(process.cwd(), "public/agentinc.jpg")).then(
  (buf) => new Uint8Array(buf).buffer as ArrayBuffer,
);

export default async function Image() {
  const logo = await logoData;

  const nodes = [
    { x: 200, y: 180, r: 24, color: "#6FEC06" },
    { x: 380, y: 120, r: 18, color: "#8B5CF6" },
    { x: 520, y: 220, r: 28, color: "#06B6D4" },
    { x: 340, y: 300, r: 20, color: "#F59E0B" },
    { x: 600, y: 350, r: 16, color: "#EC4899" },
    { x: 150, y: 350, r: 14, color: "#10B981" },
    { x: 480, y: 400, r: 22, color: "#6FEC06" },
    { x: 700, y: 200, r: 20, color: "#8B5CF6" },
    { x: 250, y: 450, r: 16, color: "#06B6D4" },
  ];

  const edges = [
    [0, 1],
    [0, 3],
    [1, 2],
    [2, 3],
    [2, 4],
    [3, 5],
    [4, 6],
    [0, 5],
    [2, 7],
    [6, 8],
    [3, 8],
    [1, 7],
  ];

  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        backgroundColor: "#0a0520",
        backgroundImage:
          "radial-gradient(ellipse 80% 60% at 40% 50%, rgba(111, 236, 6, 0.06) 0%, transparent 60%), radial-gradient(ellipse 50% 50% at 80% 30%, rgba(18, 5, 87, 0.3) 0%, transparent 50%)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <svg
        width="800"
        height="630"
        viewBox="0 0 800 630"
        style={{ position: "absolute", right: 0, top: 0, opacity: 0.6 }}
      >
        {edges.map(([a, b], i) => (
          <line
            key={i}
            x1={nodes[a].x}
            y1={nodes[a].y}
            x2={nodes[b].x}
            y2={nodes[b].y}
            stroke="rgba(111, 236, 6, 0.15)"
            strokeWidth="1.5"
          />
        ))}
        {nodes.map((n, i) => (
          <g key={i}>
            <circle cx={n.x} cy={n.y} r={n.r + 8} fill={`${n.color}15`} />
            <circle
              cx={n.x}
              cy={n.y}
              r={n.r}
              fill={`${n.color}40`}
              stroke={n.color}
              strokeWidth="2"
            />
          </g>
        ))}
      </svg>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "60px 70px",
          position: "relative",
          zIndex: 1,
          width: "60%",
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
            display: "flex",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <div
            style={{
              backgroundColor: "rgba(111, 236, 6, 0.1)",
              border: "1px solid rgba(111, 236, 6, 0.2)",
              borderRadius: 999,
              padding: "6px 16px",
              fontSize: 16,
              color: "#6FEC06",
              fontWeight: 600,
              display: "flex",
            }}
          >
            ERC-8004
          </div>
        </div>

        <div
          style={{
            fontSize: 58,
            fontWeight: 900,
            color: "white",
            lineHeight: 1.1,
            marginBottom: 20,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <span style={{ display: "flex" }}>AI Agent</span>
          <span
            style={{
              display: "flex",
              background: "linear-gradient(90deg, #6FEC06, #06B6D4)",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            Network
          </span>
        </div>

        <div
          style={{
            fontSize: 22,
            color: "rgba(255, 255, 255, 0.5)",
            lineHeight: 1.5,
            display: "flex",
          }}
        >
          Explore agents, trust tiers, and reputation data in real-time
        </div>
      </div>
    </div>,
    { ...size },
  );
}
