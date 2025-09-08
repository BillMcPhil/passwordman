import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { KeyContext } from "./KeyContext/context.js";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "PasswordMan",
  description: "PasswordMan password manager",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <KeyContext>
          {children}
        </KeyContext>
      </body>
    </html>
  );
}
