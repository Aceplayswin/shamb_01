'use client';

/** Casino Configuration — reference screen `/casinoconfiguration`. */

import ConfigPage from '@/components/admin/ConfigPage';

const GROUPS = [
  {
    title: 'Casino identity',
    hint: 'Shown to players in emails and on the site.',
    fields: [
      { key: 'site_name', label: 'Casino name' },
      { key: 'support_email', label: 'Support email', type: 'email' },
      { key: 'support_phone', label: 'Support phone' },
      { key: 'website_url', label: 'Website URL' },
      { key: 'default_currency', label: 'Default currency', placeholder: 'INR' },
      { key: 'default_language', label: 'Default language', placeholder: 'en' },
      { key: 'timezone', label: 'Timezone', placeholder: 'Asia/Kolkata' },
    ],
  },
  {
    title: 'Footer and legal',
    fields: [
      { key: 'footer_text', label: 'Footer text', type: 'textarea', full: true },
      { key: 'license_text', label: 'Licence text', type: 'textarea', full: true },
    ],
  },
];

export default function CasinoConfigPage() {
  return (
    <ConfigPage
      title="Casino Configuration"
      subtitle="Branding and contact details used across player communications."
      scope="casino"
      groups={GROUPS}
    />
  );
}
