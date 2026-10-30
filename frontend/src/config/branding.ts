const getAppUrl = (): string => {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_APP_URL || 'https://orvexa-lemon.vercel.app';
};

const getApiUrl = (): string => {
  const envApi = process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== 'undefined' && window.location) {
    const host = window.location.hostname;
    const isLocalhost = host === 'localhost' || host === '127.0.0.1';

    // If an explicit API URL is set in env and is not localhost (or if user is testing on localhost), use it
    if (envApi && (!envApi.includes('localhost') || isLocalhost)) {
      return envApi;
    }

    // If client is accessing via live orvexa.io domain
    if (host.includes('orvexa.io')) {
      return `${window.location.protocol}//api.orvexa.io/api/v1`;
    }

    // If accessed via another live domain (like Vercel, VPS IP, or custom domain)
    if (!isLocalhost) {
      if (envApi && !envApi.includes('localhost')) {
        return envApi;
      }
      // If deployed with separate api port (e.g. VPS direct IP:3000 -> IP:4000)
      if (window.location.port === '3000') {
        return `${window.location.protocol}//${host}:4000/api/v1`;
      }
      // Or standard api subdomain
      return `${window.location.protocol}//api.${host.replace(/^app\./, '')}/api/v1`;
    }
  }

  return envApi || 'http://localhost:4000/api/v1';
};

export const BRANDING = {
  name: 'ORVEXA',
  tagline: 'Connect people. Manage work. Run operations.',
  description:
    'Unify people, work, operations, time, quality, and SLA in a single clean, flexible, multi-tenant workspace.',
  domain: 'orvexa.io',
  get appUrl() {
    return getAppUrl();
  },
  get apiUrl() {
    return getApiUrl();
  },
  supportEmail: 'support@orvexa.io',
  meta: {
    title: 'ORVEXA | Connect people. Manage work. Run operations.',
    description:
      'The modern multi-tenant platform for operations, service delivery, execution teams, and enterprise organizations.',
  },
};
