'use client';

/** Email / SMS Configuration — reference screen `/emailsmsconfiguration`. */

import ConfigPage from '@/components/admin/ConfigPage';

const GROUPS = [
  {
    title: 'Outgoing email (SMTP)',
    hint: 'Credentials themselves are held in the platform secret store; this records the non-secret settings.',
    fields: [
      { key: 'smtp_host', label: 'SMTP host' },
      { key: 'smtp_port', label: 'SMTP port', type: 'number' },
      { key: 'smtp_user', label: 'SMTP username' },
      {
        key: 'smtp_encryption',
        label: 'Encryption',
        type: 'select',
        options: [
          { value: '', label: 'None' },
          { value: 'tls', label: 'TLS' },
          { value: 'ssl', label: 'SSL' },
        ],
      },
      { key: 'from_email', label: 'From address', type: 'email' },
      { key: 'from_name', label: 'From name' },
    ],
  },
  {
    title: 'SMS gateway',
    fields: [
      { key: 'sms_provider', label: 'Provider' },
      { key: 'sms_sender_id', label: 'Sender ID' },
      { key: 'sms_endpoint', label: 'Endpoint URL', full: true },
    ],
  },
];

export default function EmailSmsConfigPage() {
  return (
    <ConfigPage
      title="Email / SMS Configuration"
      subtitle="Delivery settings for outbound player messaging."
      scope="email_sms"
      groups={GROUPS}
    />
  );
}
