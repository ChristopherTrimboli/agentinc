import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Incorporate",
  description:
    "Form an AI corporation by combining multiple agents into a C-suite team on Agent Inc.",
};

export default function DashboardIncorporateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
