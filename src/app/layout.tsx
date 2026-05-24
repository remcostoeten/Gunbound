import type { Metadata, Viewport } from "next";
import { Chakra_Petch, Press_Start_2P } from "next/font/google";
import "./globals.css";

const pressStart = Press_Start_2P({
  subsets: ["latin"],
  variable: "--font-display",
  weight: "400"
});

const chakraPetch = Chakra_Petch({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"]
});

export const metadata: Metadata = {
  title: "Gunbound Local",
  description: "Local hot-seat artillery game",
  icons: {
    icon: "/favicon.svg",
    apple: "/favicon.svg"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function RootLayout(props: RootLayoutProps): React.JSX.Element {
  return (
    <html lang="en">
      <body className={pressStart.variable + " " + chakraPetch.variable}>{props.children}</body>
    </html>
  );
}
