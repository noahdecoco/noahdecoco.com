const MEASUREMENT_ID = 'G-XHCFZ003EC';
const CONSENT_KEY = 'analytics-consent';

type Consent = 'granted' | 'denied';

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

// Google's tag and its cookies only ever load after the visitor accepts
export const createAnalytics = (): void => {
  const banner = document.getElementById('cookie-banner')!;
  const acceptBtn = document.getElementById('cookie-accept')!;
  const declineBtn = document.getElementById('cookie-decline')!;
  const settingsBtn = document.getElementById('cookie-btn')!;
  const flags = window as unknown as Record<string, boolean>;
  const disableFlag = `ga-disable-${MEASUREMENT_ID}`;

  let loaded = false;

  // Browser storage can throw in private windows, so a failure just means
  // the visitor is asked again next time
  const _readConsent = (): Consent | null => {
    try {
      const value = localStorage.getItem(CONSENT_KEY);
      return value === 'granted' || value === 'denied' ? value : null;
    } catch {
      return null;
    }
  };

  const _saveConsent = (consent: Consent): void => {
    try {
      localStorage.setItem(CONSENT_KEY, consent);
    } catch {
      // nothing to do: the choice still applies to this visit
    }
  };

  const _start = (): void => {
    if (!import.meta.env.PROD) return; // don't count local development
    flags[disableFlag] = false;
    if (loaded) return;
    loaded = true;

    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
      // Google's tag needs the arguments object, not an array
      window.dataLayer.push(arguments);
    };
    window.gtag('js', new Date());
    window.gtag('config', MEASUREMENT_ID);

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
    document.head.appendChild(script);
  };

  const _stop = (): void => {
    flags[disableFlag] = true;

    const host = window.location.hostname;
    const domains = ['', `; domain=${host}`, `; domain=.${host}`];
    document.cookie
      .split(';')
      .map((cookie) => cookie.split('=')[0].trim())
      .filter((name) => name.startsWith('_ga'))
      .forEach((name) => {
        domains.forEach((domain) => {
          document.cookie = `${name}=; max-age=0; path=/${domain}`;
        });
      });
  };

  const _choose = (consent: Consent): void => {
    _saveConsent(consent);
    banner.hidden = true;
    if (consent === 'granted') _start();
    else _stop();
  };

  acceptBtn.addEventListener('click', () => _choose('granted'));
  declineBtn.addEventListener('click', () => _choose('denied'));
  settingsBtn.addEventListener('click', () => {
    banner.hidden = false;
  });

  const consent = _readConsent();
  if (consent === 'granted') _start();
  if (!consent) banner.hidden = false;
};
