import type { Metadata } from "next";
import "./globals.css";
import RegisterSW from "./components/RegisterSW";

export const metadata: Metadata = { title: "Spotibai — Your sound, your space", description: "A beautiful personal music space for listening, discovering, and organizing.", manifest:"/manifest.webmanifest", icons: {icon:"/spotibai-icon.png", apple:"/spotibai-icon.png"} };
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) { return <html lang="en"><body><RegisterSW/>{children}</body></html>; }
