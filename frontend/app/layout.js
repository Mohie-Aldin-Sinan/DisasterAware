import "./globals.css";
import Navbar from "./component/navbar";

export const metadata = {
  metadataBase: new URL("https://disasteraware.local"),
  title: {
    default: "DisasterAware | Disaster Intelligence Platform",
    template: "%s | DisasterAware",
  },
  description:
    "Disaster intelligence platform with live hazard feeds, risk assessment, and preparedness workflows for Indian cities.",
  keywords: [
    "disaster intelligence",
    "risk prediction",
    "fastapi",
    "next.js",
    "machine learning",
    "india",
    "emergency management",
  ],
  authors: [{ name: "Sinan" }],
  openGraph: {
    title: "DisasterAware | Disaster Intelligence Platform",
    description:
      "Live hazard monitoring, explainable risk assessment, and emergency readiness tooling in one platform.",
    type: "website",
  },
};

export const viewport = {
  themeColor: "#0f172a",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Navbar />
        {children}
      </body>
    </html>
  );
}
