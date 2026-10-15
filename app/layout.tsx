import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Spotibai — Your sound, your space", description: "A beautiful personal music space for listening, discovering, and organizing.", icons: {icon:"/spotibai-icon.png", apple:"/spotibai-icon.png"} };
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) { return <html lang="en"><body>{children}</body></html>; }
