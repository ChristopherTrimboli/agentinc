import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Revenue Share Leaderboard | Agent Inc.",
  description:
    "Live $AGENTINC token holder rankings. Hold 5M+ tokens to earn 50% of platform revenue, distributed automatically every 5 minutes.",
};

export default function HoldersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
