// Defaults for social / support channels. Live values come from
// Admin → Content → Social Links via useSocialLinks() / GET /api/v1/social-links.

export const SOCIAL_LINKS_DEFAULTS = {
  facebook: '',
  instagram: '',
  twitter: '',
  whatsapp: 'https://wa.link/mahakalworld',
};

/** @deprecated Prefer useSocialLinks().whatsappUrl — kept for any static fallbacks. */
export const WHATSAPP_SUPPORT_URL = SOCIAL_LINKS_DEFAULTS.whatsapp;
