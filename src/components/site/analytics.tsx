import Script from "next/script";

import { GA4_ID, GTM_ID, validId } from "@/lib/seo/tracking";

/**
 * Google Analytics and Tag Manager, when an administrator has configured them.
 *
 * Rendered on the public site only: staff screens are not traffic, and their
 * addresses — lead references, staff names — have no business being sent to a
 * third party. Each identifier is re-checked against its format here, so only
 * a value that cannot carry markup is ever written into a script.
 *
 * Loaded after the page is interactive, so neither tag delays the first paint
 * of a product page.
 */
export function SiteAnalytics({
  ga4Id,
  gtmId,
}: {
  ga4Id: string | null;
  gtmId: string | null;
}) {
  const ga4 = validId(ga4Id, GA4_ID);
  const gtm = validId(gtmId, GTM_ID);
  if (!ga4 && !gtm) return null;

  return (
    <>
      {gtm ? (
        <>
          <Script id="hn-gtm" strategy="afterInteractive">
            {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtm}');`}
          </Script>
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${gtm}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
              title="Google Tag Manager"
            />
          </noscript>
        </>
      ) : null}
      {ga4 ? (
        <>
          <Script
            id="hn-ga4-loader"
            src={`https://www.googletagmanager.com/gtag/js?id=${ga4}`}
            strategy="afterInteractive"
          />
          <Script id="hn-ga4" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ga4}');`}
          </Script>
        </>
      ) : null}
    </>
  );
}
