import { Audience } from "@/components/marketing/audience";
import { Difference } from "@/components/marketing/difference";
import { ExampleScripts } from "@/components/marketing/example-scripts";
import { Faq } from "@/components/marketing/faq";
import { FinalCta } from "@/components/marketing/final-cta";
import { Hero } from "@/components/marketing/hero";
import { Honesty } from "@/components/marketing/honesty";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { Marquee } from "@/components/marketing/marquee";
import { Pricing } from "@/components/marketing/pricing";
import { PrompterSection } from "@/components/marketing/prompter-section";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";

/**
 * Внутри Telegram витрина не нужна: уводим в Mini App до первой отрисовки,
 * сохраняя tgWebAppData из search/hash.
 */
const TELEGRAM_REDIRECT = `(function(){try{var t=window.Telegram&&window.Telegram.WebApp;var d=location.hash.indexOf("tgWebAppData")>-1||location.search.indexOf("tgWebAppData")>-1;if((t||d)&&location.pathname==="/"){location.replace("/app"+location.search+location.hash);}}catch(e){}})();`;

export default function HomePage() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: TELEGRAM_REDIRECT }} />
      <div className="bg-cream text-ink">
        <SiteHeader />
        <main>
          <Hero />
          <Marquee />
          <HowItWorks />
          <Difference />
          <ExampleScripts />
          <PrompterSection />
          <Audience />
          <Pricing />
          <Honesty />
          <Faq />
          <FinalCta />
        </main>
        <SiteFooter />
      </div>
    </>
  );
}
