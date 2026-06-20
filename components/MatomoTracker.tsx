'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export default function MatomoTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialized = useRef(false);

  useEffect(() => {
    const matomoUrl = process.env.NEXT_PUBLIC_MATOMO_URL;
    const siteId = process.env.NEXT_PUBLIC_MATOMO_SITE_ID;

    // Skip tracking if the Matomo instance is not configured or uses placeholder
    if (!matomoUrl || !siteId || matomoUrl.includes('your-matomo-domain')) {
      return;
    }

    if (!initialized.current) {
      window._paq = window._paq || [];
      window._paq.push(['trackPageView']);
      window._paq.push(['enableLinkTracking']);

      const u = matomoUrl.endsWith('/') ? matomoUrl : `${matomoUrl}/`;
      window._paq.push(['setTrackerUrl', `${u}matomo.php`]);
      window._paq.push(['setSiteId', siteId]);

      const d = document;
      const g = d.createElement('script');
      const s = d.getElementsByTagName('script')[0];
      g.async = true;
      g.src = `${u}matomo.js`;

      if (s && s.parentNode) {
        s.parentNode.insertBefore(g, s);
      }

      initialized.current = true;
    }
  }, []);

  // Track page view on route transitions
  useEffect(() => {
    if (!initialized.current) return;

    window._paq = window._paq || [];
    const url = window.location.href;

    // Small timeout ensures browser title updates before page view is recorded
    const timer = setTimeout(() => {
      window._paq?.push(['setCustomUrl', url]);
      window._paq?.push(['setDocumentTitle', document.title]);
      window._paq?.push(['trackPageView']);
    }, 150);

    return () => clearTimeout(timer);
  }, [pathname, searchParams]);

  return null;
}
