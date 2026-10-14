'use client';

// Social / support links — URLs shown in player footers and the floating
// WhatsApp button. Empty fields are hidden on the live site.

import { useEffect, useState } from 'react';
import { ExternalLink, Share2 } from 'lucide-react';
import { adminApi } from '@/services/adminApi';
import {
  AdminShell,
  Button,
  Card,
  Field,
  Input,
  toast,
  useAdminData,
} from '@/components/admin/AdminShell';

const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:3000';

const FIELDS = [
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    placeholder: 'https://wa.me/91… or https://wa.link/…',
    hint: 'Support CTA in every theme footer and the floating button',
  },
  {
    key: 'facebook',
    label: 'Facebook',
    placeholder: 'https://facebook.com/…',
    hint: 'Shown in the social icon row when set',
  },
  {
    key: 'instagram',
    label: 'Instagram',
    placeholder: 'https://instagram.com/…',
    hint: 'Shown in the social icon row when set',
  },
  {
    key: 'twitter',
    label: 'X (Twitter)',
    placeholder: 'https://x.com/…',
    hint: 'Shown in the social icon row when set',
  },
];

const BLANK = {
  facebook: '',
  instagram: '',
  twitter: '',
  whatsapp: '',
};

export default function AdminSocialLinksPage() {
  const { data, loading } = useAdminData('/api/v1/admin/social-links');
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data) return;
    setForm({
      facebook: data.facebook ?? '',
      instagram: data.instagram ?? '',
      twitter: data.twitter ?? '',
      whatsapp: data.whatsapp ?? '',
    });
  }, [data]);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const save = async () => {
    setSaving(true);
    try {
      await adminApi('/api/v1/admin/social-links/update', {
        method: 'PUT',
        body: JSON.stringify(form),
      });
      toast.success('Social links updated');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const filled = FIELDS.filter((f) => (form[f.key] || '').trim()).length;

  return (
    <AdminShell
      title="Social Links"
      subtitle="Manage WhatsApp, Facebook, Instagram and X links shown to players"
      actions={
        <Button onClick={save} disabled={saving || loading}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      }
    >
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card className="p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
              Profiles
            </h2>
            <div className="space-y-4">
              {FIELDS.map((field) => (
                <Field key={field.key} label={field.label}>
                  <Input
                    value={form[field.key]}
                    onChange={(e) => set(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    type="url"
                  />
                  <p className="mt-1.5 text-xs text-slate-500">{field.hint}</p>
                </Field>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
              Status
            </h2>
            <div className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950 p-4">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-indigo-500/10 text-indigo-400 ring-1 ring-inset ring-indigo-500/20">
                <Share2 className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold text-white">
                  {filled} of {FIELDS.length} set
                </p>
                <p className="text-xs text-slate-500">
                  Empty URLs are hidden on the player site
                </p>
              </div>
            </div>

            <a
              href={WEB_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-400 hover:text-indigo-300"
            >
              <ExternalLink className="h-3.5 w-3.5" /> View player site
            </a>

            <p className="mt-4 text-xs text-slate-500">
              Changes apply on the next load of the player site (and when the
              tab regains focus).
            </p>
          </Card>
        </div>
      </div>
    </AdminShell>
  );
}
