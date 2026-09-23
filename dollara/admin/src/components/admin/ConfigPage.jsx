'use client';

/**
 * Key/value configuration screen — reference `/casinoconfiguration` and
 * `/emailsmsconfiguration`.
 *
 * The settings are stored as free-form key/value pairs, so the page declares
 * the keys it wants to expose and renders an input for each.
 */

import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { adminApi } from '@/services/adminApi';
import {
  AdminShell,
  Button,
  Card,
  Field,
  Input,
  Select,
  Textarea,
  ErrorState,
  toast,
} from '@/components/admin/AdminShell';

export default function ConfigPage({ title, subtitle, scope, groups, path }) {
  // Mailing config is scoped (`/configuration/<scope>`); the sportsbook has its
  // own endpoint, so a caller may name the path outright.
  const endpoint = path ?? `/api/v1/admin/bo/configuration/${scope}`;
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    setError(null);
    adminApi(endpoint)
      .then((data) => setValues(data ?? {}))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [endpoint]);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const saved = await adminApi(endpoint, {
        method: 'PUT',
        body: JSON.stringify(values),
      });
      setValues(saved ?? values);
      toast.success('Configuration saved');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const set = (key) => (e) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));

  if (error) {
    return (
      <AdminShell title={title} subtitle={subtitle}>
        <ErrorState message={error} onRetry={load} />
      </AdminShell>
    );
  }

  return (
    <AdminShell title={title} subtitle={subtitle}>
      <form onSubmit={save} className="space-y-5">
        {groups.map((group) => (
          <Card key={group.title} className="p-5">
            <h2 className="font-display text-sm font-bold text-white">{group.title}</h2>
            {group.hint && (
              <p className="mt-1 text-xs text-slate-500">{group.hint}</p>
            )}
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {group.fields.map((f) => (
                <Field
                  key={f.key}
                  label={f.label}
                  className={f.full ? 'sm:col-span-2' : ''}
                >
                  {f.type === 'textarea' ? (
                    <Textarea
                      rows={4}
                      value={values[f.key] ?? ''}
                      onChange={set(f.key)}
                      placeholder={f.placeholder}
                      disabled={loading}
                    />
                  ) : f.type === 'select' ? (
                    <Select
                      value={values[f.key] ?? ''}
                      onChange={set(f.key)}
                      disabled={loading}
                    >
                      {f.options.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <Input
                      type={f.type ?? 'text'}
                      value={values[f.key] ?? ''}
                      onChange={set(f.key)}
                      placeholder={f.placeholder}
                      disabled={loading}
                    />
                  )}
                </Field>
              ))}
            </div>
          </Card>
        ))}

        <div>
          <Button type="submit" icon={Save} busy={busy} disabled={loading}>
            Save configuration
          </Button>
        </div>
      </form>
    </AdminShell>
  );
}
