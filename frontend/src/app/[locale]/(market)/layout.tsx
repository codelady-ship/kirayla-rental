import { setRequestLocale } from "next-intl/server";
import { MarketHeader } from "@/components/site/market-header";
import { Footer } from "@/components/site/footer";

/** Everything after you click into a category: white gallery, photo first, coral reserved for actions. */
export default async function MarketLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <div data-zone="market" className="flex min-h-dvh flex-col bg-white text-hof">
      <MarketHeader />
      <main id="main" className="flex-1 animate-zone-in">
        {children}
      </main>
      <Footer tone="market" locale={locale} />
    </div>
  );
}
