
import "./globals.css";

export const metadata = {
  title: "Macy's - Men's Cable-Knit Cotton Sweater",
  description: "Virtual Try-On Demo",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
