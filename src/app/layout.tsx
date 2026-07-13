import type { Metadata } from 'next';
// @ts-ignore
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { FirebaseClientProvider } from "@/firebase";

export const metadata: Metadata = {
  title: 'FastDocs - Instant HR Documents',
  description: 'The fastest way to generate professional HR certificates and documents.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <FirebaseClientProvider>
          {children}
          <Toaster/>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}