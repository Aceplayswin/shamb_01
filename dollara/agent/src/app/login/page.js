'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Eye, EyeOff, Lock, User } from 'lucide-react';
import { agentLogin, getAgentToken } from '../../services/agentApi';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Already signed in — skip the form rather than making them log in twice.
  useEffect(() => {
    if (getAgentToken()) router.replace('/dashboard');
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      await agentLogin(username.trim(), password);
      router.replace('/dashboard');
    } catch (err) {
      // Shown inline rather than in a modal: the message usually says what to
      // fix ("suspended", "locked"), and a dialog buries that.
      setError(err.message || 'Could not sign you in. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm animate-fade-up">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-ink">Agent Panel</h1>
          <p className="mt-2 text-xs text-ink-muted">
            Sign in with the credentials your upline issued
          </p>
        </div>

        <div className="card p-6">
          {error && (
            <div className="mb-5 flex items-start gap-2 rounded border border-down/40 bg-down/10 px-4 py-3 text-sm text-down">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="agent-username" className="field-label">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-ink-faint" />
                <input
                  id="agent-username"
                  type="text"
                  required
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="field pl-9"
                />
              </div>
            </div>

            <div>
              <label htmlFor="agent-password" className="field-label">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-ink-faint" />
                <input
                  id="agent-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="field px-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-ink-faint transition hover:text-ink"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-ink-faint">
          Accounts are opened by your upline — there is no self sign-up.
        </p>
      </div>
    </div>
  );
}
