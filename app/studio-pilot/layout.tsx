import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "K4K App | AI Video Creation" },
  description: "K4K App — explore viral AI video examples, creative workflows, and credit-based video generation plans.",
  applicationName: "K4K App",
  twitter: { title: "K4K App | AI Video Creation", description: "Create standout AI videos with K4K App." },
  openGraph: {
    title: "K4K App | AI Video Creation",
    description: "Explore viral AI video examples and creator workflows with K4K App.",
    siteName: "K4K App",
    type: "website",
  },
};

export default function StudioPilotLayout({ children }: { children: React.ReactNode }) {
  return children;
}
