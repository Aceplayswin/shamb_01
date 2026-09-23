'use client';

// Icon row for configured social profiles. Empty URLs are omitted so operators
// can leave channels blank without showing dead links.

import { Facebook, Instagram, Twitter, MessageCircle } from 'lucide-react';
import { useSocialLinks } from '@/hooks/useSocialLinks';

const CHANNELS = [
  { key: 'facebook', label: 'Facebook', Icon: Facebook },
  { key: 'instagram', label: 'Instagram', Icon: Instagram },
  { key: 'twitter', label: 'X', Icon: Twitter },
];

export function SocialIconRow({ className = '', itemClassName = '' }) {
  const { links } = useSocialLinks();
  const items = CHANNELS.filter((c) => links[c.key]);

  if (!items.length) return null;

  return (
    <div className={className}>
      {items.map(({ key, label, Icon }) => (
        <a
          key={key}
          href={links[key]}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          title={label}
          className={itemClassName}
        >
          <Icon className="h-4 w-4" />
        </a>
      ))}
    </div>
  );
}

export function WhatsAppSupportLink({ className = '', iconClassName = 'h-4 w-4' }) {
  const { whatsappUrl } = useSocialLinks();
  if (!whatsappUrl) return null;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      <MessageCircle className={iconClassName} />
      WhatsApp Support
    </a>
  );
}
