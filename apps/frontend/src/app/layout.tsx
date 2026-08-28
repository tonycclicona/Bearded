import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import Providers from "@/components/providers";
import ThemeInit from "@/components/theme-init";
import WhatsAppBubble from "@/components/WhatsAppBubble";
import { BookingModal } from "@/components/booking/BookingModal";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Bearded Mountaineer | Sacred Garden & Lodge en Cusco, Perú",
  description: "Experimenta el avistamiento del colibrí pico de espada (Ensifera ensifera), recorre las rutas sagradas de observación de aves y hospédate en nuestras cabañas rústicas de alta calidad en San Salvador, Cusco.",
  keywords: ["lodge cusco", "avistamiento de colibríes", "ensifera ensifera", "observación de aves perú", "fotografía de naturaleza", "turismo cusco"],
  icons: {
    icon: [
      { url: "/logo_BEARDEDMOUNTANIER.png", type: "image/png" },
      { url: "/favicon.png", type: "image/png" }
    ],
    shortcut: "/logo_BEARDEDMOUNTANIER.png",
    apple: "/logo_BEARDEDMOUNTANIER.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${playfair.variable} ${inter.variable} scroll-smooth antialiased`}
    >
      <body className="min-h-screen bg-background text-foreground font-sans flex flex-col">
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('antigravity-theme');if(t!=='light'){document.documentElement.classList.add('dark')}}catch(e){}})();`,
          }}
        />
        <ThemeInit />
        <Providers>
          {children}
          <WhatsAppBubble />
          <BookingModal />
        </Providers>
      </body>
    </html>
  );
}
