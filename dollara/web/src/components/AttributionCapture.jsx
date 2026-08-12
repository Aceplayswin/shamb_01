'use client';

import { useEffect } from 'react';

/**
 * Remembers which affiliate sent this visitor.
 *
 * A tracking link goes /r/<code> on the API, which logs the click and redirects
 * here with ?ref=&sub=&clk=. This picks those up and stashes them so that a
 * registration minutes or days later can still be attributed.
 *
 * localStorage rather than a cookie on purpose: the API (:5000) and this site
 * (:3000) are different origins, so a cookie the API set would never be
 * readable here without SameSite=None and a shared parent domain. Storing it on
 * the site's own origin sidesteps that entirely.
 *
 * Renders nothing.
 */
export const ATTRIBUTION_KEY = 'aff_attr';

export function AttributionCapture() {
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get('ref');
      if (!ref) return;

      // Last click wins: a visitor who arrives through a second partner's link
      // belongs to that partner, which is the industry norm and the rule the
      // API validates against.
      window.localStorage.setItem(
        ATTRIBUTION_KEY,
        JSON.stringify({
          ref,
          sub: params.get('sub') || null,
          clk: params.get('clk') || null,
          at: Date.now(),
        }),
      );

      // Strip the params so they do not end up in bookmarks or shared URLs,
      // where they would attribute somebody else's signup to this partner.
      params.delete('ref');
      params.delete('sub');
      params.delete('clk');
      const query = params.toString();
      window.history.replaceState(
        {},
        '',
        window.location.pathname + (query ? `?${query}` : '') + window.location.hash,
      );
    } catch {
      // Private-browsing modes can throw on localStorage. Losing attribution is
      // an acceptable outcome; breaking the landing page is not.
    }
  }, []);

  return null;
}
