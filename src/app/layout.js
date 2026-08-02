import { Inter } from "next/font/google";
import "./globals.css";
import Layout from "@/components/Layout";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "TalentProof - Evidence-Backed Resume Intelligence",
  description: "Bulk resume screening with real cross-candidate RAG search, similarity matching, interview prep, and file conversion.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full scroll-smooth">
      <body className={`${inter.className} min-h-full bg-slate-50 dark:bg-slate-950 transition-colors duration-200 antialiased`}>
        <Layout>{children}</Layout>
      </body>
    </html>
  );
}
