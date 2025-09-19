"use client";
import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseBrowser';
import { AUTH_BROWSER_ORIGIN } from '@/lib/authOrigins';

// Basic utility components/styles kept inline for self-containment.
// Tailwind is available project-wide per existing config.

interface VerifyState {
  status: 'idle' | 'verifying' | 'needs_new_password' | 'updating' | 'success' | 'error';
  errorCode?: string;
  errorMessage?: string;
}

const PASSWORD_MIN = 8;

export default function ResetPasswordPage() {
  const search = useSearchParams();
  const router = useRouter();
  const [verifyState, setVerifyState] = useState<VerifyState>({ status: 'idle' });
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Supabase password recovery links may arrive either as query params or a hash fragment (#access_token=...)
  // We'll parse both for robustness.
  const [parsed, setParsed] = useState<{ token: string; type: string; accessToken?: string } | null>(null);

  // Parse URL hash fragment on mount (client-side only)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
    const hashParams = new URLSearchParams(hash);
    // Common keys: access_token, refresh_token, type, token_hash
    const hashAccessToken = hashParams.get('access_token');
    const hashType = hashParams.get('type');
    const tokenHash = hashParams.get('token_hash');
    const qpToken = search?.get('token') || search?.get('access_token');
    const qpType = search?.get('type');
    const finalType = hashType || qpType || 'recovery';
    // Token preference order: explicit token param > token_hash (sometimes) > access_token
    const finalToken = qpToken || tokenHash || hashAccessToken || '';
    setParsed({ token: finalToken, type: finalType, accessToken: hashAccessToken || undefined });
  }, [search]);

  const token = parsed?.token || '';
  const type = (parsed?.type || 'recovery') as 'recovery' | 'magiclink' | 'invite' | 'signup';

  // We assume email was stored earlier when user initiated the password reset request.
  const getStoredEmail = () => {
    try {
      return localStorage.getItem('pw-reset-email') || localStorage.getItem('supabase-reset-email') || '';
    } catch {
      return '';
    }
  };

  const [email, setEmail] = useState<string>('');

  useEffect(() => {
    // Accept email via query param for cases where localStorage was cleared or different context (e.g., installed PWA vs browser)
    const qpEmail = search?.get('email');
    if (qpEmail && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(qpEmail)) {
      setEmail(qpEmail);
      try { localStorage.setItem('pw-reset-email', qpEmail); } catch {}
    } else {
      setEmail(getStoredEmail());
    }
  }, [search]);

  const beginVerify = useCallback(async (overrideEmail?: string) => {
    if (!token) {
      setVerifyState({ status: 'error', errorMessage: 'Missing token. Please re-initiate password recovery.' });
      return;
    }
    const emailAddr = overrideEmail || getStoredEmail();
    if (!emailAddr) {
      // We'll allow user to input an email manually (UI below) instead of hard error.
      setVerifyState({ status: 'error', errorMessage: 'Email not found locally. Please enter your email below to continue.' });
      return;
    }

    setVerifyState({ status: 'verifying' });
    try {
      // Check if session is already established (hash auth flow) – if so, skip verifyOtp.
      const { data: existingSession } = await supabase.auth.getSession();
      if (existingSession.session) {
        setVerifyState({ status: 'needs_new_password' });
        return;
      }

      const { error } = await supabase.auth.verifyOtp({ type: 'recovery', token, email: emailAddr });
      if (error) {
        let code = (error as any).code || (error as any).status || '';
        setVerifyState({
          status: 'error',
          errorCode: code,
          errorMessage: humanizeError(code, error.message)
        });
        return;
      }
      setVerifyState({ status: 'needs_new_password' });
    } catch (e: any) {
      setVerifyState({ status: 'error', errorMessage: e?.message || 'Unexpected error verifying token.' });
    }
  }, [token]);

  useEffect(() => {
    // Start only after parsing complete
    if (verifyState.status === 'idle' && parsed) {
      if (token) beginVerify();
      else setVerifyState({ status: 'error', errorMessage: 'Missing token parameter.' });
    }
  }, [token, verifyState.status, beginVerify, parsed]);

  // Escape out of standalone PWA into external browser origin (new tab) if configured
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
      if (!isStandalone) return;
      const currentOrigin = window.location.origin;
      if (AUTH_BROWSER_ORIGIN && AUTH_BROWSER_ORIGIN !== currentOrigin) {
        const target = `${AUTH_BROWSER_ORIGIN}/reset-password${window.location.search}${window.location.hash}`;
        // Open in new window/tab to ensure system browser; don't replace current PWA history yet.
        window.open(target, '_blank', 'noopener,noreferrer');
      }
    } catch {}
  }, []);

  const humanizeError = (code: string, fallback: string) => {
    switch (code) {
      case 'otp_expired':
        return 'This reset link has expired. Please request a new password reset email.';
      case 'invalid_token':
        return 'The reset link is invalid or already used. Request a new one.';
      case 'invalid_email':
        return 'The email associated with this reset is invalid.';
      default:
        return fallback || 'An error occurred.';
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setInfo(null);
    if (password.length < PASSWORD_MIN) {
      setFormError(`Password must be at least ${PASSWORD_MIN} characters.`);
      return;
    }
    if (password !== confirm) {
      setFormError('Passwords do not match.');
      return;
    }

    setVerifyState(s => ({ ...s, status: 'updating' }));
    try {
      const { data, error } = await supabase.auth.updateUser({ password });
      if (error) {
        setVerifyState({ status: 'needs_new_password' });
        setFormError(error.message);
        return;
      }
      // Clear stored email after success
      try {
        localStorage.removeItem('pw-reset-email');
        localStorage.removeItem('supabase-reset-email');
      } catch {}
      setVerifyState({ status: 'success' });
      setInfo('Password updated successfully. You will be redirected to login shortly...');
      // Redirect after delay
      setTimeout(() => {
        router.push('/login');
      }, 4000);
    } catch (e: any) {
      setVerifyState({ status: 'needs_new_password' });
      setFormError(e?.message || 'Unexpected error updating password.');
    }
  };

  const renderBody = () => {
    switch (verifyState.status) {
      case 'verifying':
      case 'idle':
        return (
          <div className="flex flex-col items-center gap-4 py-12">
            <Spinner />
            <p className="text-sm text-gray-600">Verifying reset link...</p>
          </div>
        );
      case 'error':
        return (
          <div className="space-y-4">
            <div className="rounded-md bg-red-50 border border-red-200 p-4 text-red-700 text-sm">
              {verifyState.errorMessage || 'Verification failed.'}
              {verifyState.errorCode && (
                <div className="mt-1 text-xs opacity-70">Code: {verifyState.errorCode}</div>
              )}
            </div>
            <div className="text-sm text-gray-600 space-y-2">
              <p>How to proceed:</p>
              <ul className="list-disc ml-5 mt-1 space-y-1">
                <li>Request a new password reset email.</li>
                <li>Ensure you're using the latest link (not previously used).</li>
                <li>If this keeps happening, clear site data and try again.</li>
              </ul>
              {!email && (
                <div className="mt-4 p-3 border rounded-md bg-gray-50">
                  <p className="text-xs mb-2 font-medium">Enter your account email to retry verification:</p>
                  <EmailRetryForm onSubmit={em => { localStorage.setItem('pw-reset-email', em); setEmail(em); beginVerify(em); }} />
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              <a href="/forgot-password" className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-white text-sm font-medium hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400">Request New Link</a>
              {email && (
                <button onClick={() => beginVerify(email)} type="button" className="inline-flex items-center rounded-md bg-gray-200 px-4 py-2 text-sm font-medium hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400">Retry</button>
              )}
            </div>
          </div>
        );
      case 'needs_new_password':
      case 'updating':
        return (
          <form onSubmit={onSubmit} className="space-y-6" noValidate>
            <div>
              <label className="block text-sm font-medium mb-1">New Password</label>
              <input
                type="password"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={password}
                onChange={e => setPassword(e.target.value)}
                minLength={PASSWORD_MIN}
                required
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Confirm New Password</label>
              <input
                type="password"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
            {formError && <div className="text-sm text-red-600">{formError}</div>}
            {info && <div className="text-sm text-green-600">{info}</div>}
            <button
              type="submit"
              disabled={verifyState.status === 'updating'}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              {verifyState.status === 'updating' && <Spinner size={4} />}<span>Update Password</span>
            </button>
          </form>
        );
      case 'success':
        return (
          <div className="space-y-4">
            <div className="rounded-md bg-green-50 border border-green-200 p-4 text-green-700 text-sm">
              Password updated successfully.
            </div>
            <p className="text-sm text-gray-600">Redirecting to login...</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gray-50">
      <div className="w-full max-w-md">
        <div className="bg-white shadow-sm rounded-lg p-6 md:p-8 border border-gray-100">
          <h1 className="text-xl font-semibold mb-2">Reset Password</h1>
          <p className="text-sm text-gray-600 mb-6">{verifyState.status === 'needs_new_password' || verifyState.status === 'updating' ? 'Enter a new password for your account.' : 'Processing your reset request.'}</p>
          <PwaModeNotice />
          {renderBody()}
        </div>
        <p className="text-center text-xs text-gray-500 mt-6">
          If you didn&apos;t request this, you can safely ignore this page.
        </p>
      </div>
    </div>
  );
}

function Spinner({ size = 5 }: { size?: number }) {
  const px = `${size * 0.25}rem`;
  return (
    <span
      className="inline-block animate-spin rounded-full border-2 border-current border-t-transparent text-indigo-600"
      style={{ width: px, height: px }}
      aria-label="loading"
    />
  );
}

function PwaModeNotice() {
  const [standalone, setStandalone] = useState(false)
  useEffect(() => {
    try {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true
      setStandalone(isStandalone)
    } catch {}
  }, [])
  if (!standalone) return null
  return (
    <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-800 text-xs leading-relaxed">
      You opened this link inside the installed app (PWA). If verification fails or you expected a browser window, long‑press / right‑click the reset link in your email and choose “Open in Browser”. The form still works here, but some browser extensions or password managers may not appear.
      <div className="mt-2 flex gap-2">
        <OpenInBrowserButton />
      </div>
    </div>
  )
}

function OpenInBrowserButton() {
  const open = () => {
    try {
      const target = `${AUTH_BROWSER_ORIGIN}/reset-password${window.location.search}${window.location.hash}`
      // user-initiated open avoids popup blockers
      window.open(target, '_blank', 'noopener,noreferrer')
    } catch (e) {
      // fallback: copy to clipboard
      try { navigator.clipboard.writeText(window.location.href) } catch {}
      alert('Could not open new tab automatically. The reset URL was copied to your clipboard.')
    }
  }
  return (
    <button onClick={open} className="inline-flex items-center rounded-md bg-amber-600 px-3 py-1 text-white text-xs hover:bg-amber-500">Open in browser</button>
  )
}

function EmailRetryForm({ onSubmit }: { onSubmit: (email: string) => void }) {
  const [val, setVal] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const handle = (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!val || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(val)) {
      setErr('Enter a valid email');
      return;
    }
    onSubmit(val.trim());
  };
  return (
    <form onSubmit={handle} className="space-y-2">
      <input
        type="email"
        placeholder="you@example.com"
        value={val}
        onChange={e => setVal(e.target.value)}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        required
      />
      {err && <div className="text-xs text-red-600">{err}</div>}
      <button type="submit" className="w-full rounded-md bg-indigo-600 text-white text-xs font-medium py-2 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400">Retry Verification</button>
    </form>
  );
}
