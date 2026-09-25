/**
 * Google Analytics 4 (GA4) Client-Side Telemetry & Event Dispatcher
 */

export const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_ID || '';

// https://developers.google.com/analytics/devguides/collection/gtagjs/pages
export const pageview = (url: string) => {
  if (typeof window !== 'undefined' && (window as any).gtag && GA_TRACKING_ID) {
    (window as any).gtag('config', GA_TRACKING_ID, {
      page_path: url,
    });
  }
};

// https://developers.google.com/analytics/devguides/collection/gtagjs/events
export const event = (action: string, params: Record<string, any> = {}) => {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', action, params);
  }
};

// Pre-defined high-intent conversion actions
export const trackConversion = {
  clickCTA: (ctaName: string, location: string) => {
    event('click_cta', { cta_name: ctaName, location });
  },
  viewDocs: (section: string) => {
    event('view_documentation', { section });
  },
  runSandboxSimulator: (mode: string) => {
    event('run_sandbox_simulator', { simulator_mode: mode });
  },
  clickCompare: (competitor: string) => {
    event('view_comparison', { competitor });
  },
  clickGithub: () => {
    event('click_external_github', { destination: 'github.com/selixes/gateway' });
  }
};
