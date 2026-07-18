'use client';

// App distribution — publish the Android build players download from /app.
// The APK itself is hosted wherever the operator prefers (S3, CDN, the media
// upload endpoint); this page records the URL and release metadata.

import { useEffect, useState } from 'react';
import { ExternalLink, Smartphone } from 'lucide-react';
import { adminApi } from '@/services/adminApi';
import {
  AdminShell,
  Button,
  Card,
  Field,
  Input,
  Textarea,
  Toggle,
  toast,
  useAdminData,
} from '@/components/admin/AdminShell';

const BLANK = {
  enabled: false,
  apk_url: '',
  version: '',
  size_mb: '',
  min_android: '',
  release_notes: '',
  ios_url: '',
};

export default function AdminAppPage() {
  const { data, loading } = useAdminData('/api/v1/admin/app-download');
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data) return;
    setForm({
      enabled: !!data.enabled,
      apk_url: data.apk_url ?? '',
      version: data.version ?? '',
      size_mb: data.size_mb ?? '',
      min_android: data.min_android ?? '',
      release_notes: data.release_notes ?? '',
      ios_url: data.ios_url ?? '',
    });
  }, [data]);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const save = async () => {
    if (form.enabled && !form.apk_url.trim()) {
      toast.error('An APK URL is required before the download can go live');
      return;
    }
    setSaving(true);
    try {
      await adminApi('/api/v1/admin/app-download/update', {
        method: 'PUT',
        body: JSON.stringify({
          ...form,
          size_mb: form.size_mb === '' ? null : Number(form.size_mb),
        }),
      });
      toast.success('App download updated');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell
      title="App Download"
      subtitle="Publish the Android build for players"
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
              Release
            </h2>
            <div className="space-y-4">
              <Toggle
                checked={form.enabled}
                onChange={(v) => set('enabled', v)}
                label="Show the download page to players"
              />
              <Field label="APK URL">
                <Input
                  value={form.apk_url}
                  onChange={(e) => set('apk_url', e.target.value)}
                  placeholder="https://cdn.example.com/app-1.4.0.apk"
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Version">
                  <Input
                    value={form.version}
                    onChange={(e) => set('version', e.target.value)}
                    placeholder="1.4.0"
                  />
                </Field>
                <Field label="Size (MB)">
                  <Input
                    type="number"
                    value={form.size_mb}
                    onChange={(e) => set('size_mb', e.target.value)}
                    placeholder="28"
                  />
                </Field>
                <Field label="Min Android">
                  <Input
                    value={form.min_android}
                    onChange={(e) => set('min_android', e.target.value)}
                    placeholder="8.0"
                  />
                </Field>
              </div>
              <Field label="Release notes">
                <Textarea
                  rows={4}
                  value={form.release_notes}
                  onChange={(e) => set('release_notes', e.target.value)}
                  placeholder="What changed in this build…"
                />
              </Field>
              <Field label="iOS link (optional)">
                <Input
                  value={form.ios_url}
                  onChange={(e) => set('ios_url', e.target.value)}
                  placeholder="https://apps.apple.com/…"
                />
              </Field>
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
              Status
            </h2>
            <div className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950 p-4">
              <span
                className={`grid h-10 w-10 place-items-center rounded-lg ring-1 ring-inset ${
                  data?.available
                    ? 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20'
                    : 'bg-slate-500/10 text-slate-400 ring-slate-500/20'
                }`}
              >
                <Smartphone className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold text-white">
                  {data?.available ? 'Live' : 'Not published'}
                </p>
                <p className="text-xs text-slate-500">
                  {data?.available
                    ? `Version ${data.version || '—'} is downloadable`
                    : 'Players see a “coming soon” message'}
                </p>
              </div>
            </div>

            <a
              href="/app"
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-400 hover:text-indigo-300"
            >
              <ExternalLink className="h-3.5 w-3.5" /> View player page
            </a>

            <p className="mt-4 text-xs text-slate-500">
              Players download via <code className="text-slate-400">/api/v1/app/apk</code>,
              which redirects to the URL above — replacing the build keeps every
              existing link and QR code working.
            </p>
          </Card>
        </div>
      </div>
    </AdminShell>
  );
}
