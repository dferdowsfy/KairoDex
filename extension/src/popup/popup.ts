import './popup.css';
import { hasConfig } from '../supabaseClient';

const root = document.getElementById('app') as HTMLDivElement;

type SelectedField = {
  id: string;
  label: string;
  text: string;
  xpath: string;
};

type PopupState = {
  isAuthenticated: boolean;
  isSelecting: boolean;
  isSaving: boolean;
  error?: string;
  fields: SelectedField[];
  email?: string;
  password?: string;
};

const state: PopupState = {
  isAuthenticated: false,
  isSelecting: false,
  isSaving: false,
  fields: [],
};

const getLocalSession = async (): Promise<{ token: string; user: { id: string; email?: string; firstName?: string; lastName?: string } } | null> => {
  const res = await chrome.storage.local.get(['ah_session']);
  return (res as any).ah_session || null;
};

const setLocalSession = async (session: { token: string; user: any } | null) => {
  if (session) {
    await chrome.storage.local.set({ ah_session: session });
  } else {
    await chrome.storage.local.remove(['ah_session']);
  }
};

const render = async () => {
  const configPresent = await hasConfig();
  if (!configPresent) {
    state.isAuthenticated = false;
    state.error = 'Supabase not configured. Open Options and set SUPABASE_URL and SUPABASE_ANON_KEY.';
  } else {
    const session = await getLocalSession();
    state.isAuthenticated = !!session?.token && !!session?.user?.id;
  }

  root.innerHTML = `
    <div class="container">
      <header>
        <div class="brand">AgentHub Extractor</div>
        ${state.isAuthenticated ? `<button id="logoutBtn" class="btn ghost">Logout</button>` : ''}
      </header>

      ${!state.isAuthenticated ? `
      <section class="card">
        <h2>Sign in</h2>
        <label>Email <input id="email" type="email" placeholder="you@company.com" /></label>
        <label>Password <input id="password" type="password" placeholder="••••••••" /></label>
        <button id="loginBtn" class="btn primary">Login</button>
        ${state.error ? `<div class="error">${state.error}</div>` : ''}
        <p class="hint" style="margin-top:8px;opacity:.8">If login fails immediately, set Supabase config in Options.</p>
        <div style="margin-top:8px">
          <a id="openOptions" class="btn ghost" href="#">Open Options</a>
        </div>
      </section>
      ` : `
      <section class="card">
        <div class="row">
          <button id="selectBtn" class="btn secondary">${state.isSelecting ? 'Selecting…' : 'Start Selecting'}</button>
          <button id="saveBtn" class="btn primary" ${state.fields.length === 0 || state.isSaving ? 'disabled' : ''}>${state.isSaving ? 'Saving…' : 'Save and Sync to AgentHub'}</button>
        </div>
      </section>

      <section class="card">
        <h2>Selected Fields (${state.fields.length})</h2>
        <div class="list">
          ${state.fields.map(f => `
            <div class="list-item">
              <div class="meta">
                <div class="label">${f.label}</div>
                <div class="hint">${f.xpath}</div>
              </div>
              <div class="text">${escapeHtml(f.text).slice(0, 240)}</div>
              <button data-id="${f.id}" class="btn xs ghost remove">Remove</button>
            </div>
          `).join('')}
        </div>
      </section>
      `}
    </div>
  `;

  if (!state.isAuthenticated) {
    document.getElementById('loginBtn')?.addEventListener('click', async () => {
      const email = (document.getElementById('email') as HTMLInputElement)?.value;
      const password = (document.getElementById('password') as HTMLInputElement)?.value;
      try {
        const resp = await fetch('http://localhost:3001/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await resp.json();
        if (!resp.ok || !data?.success) throw new Error(data?.error || 'Login failed');
        const session = { token: data.data.token, user: data.data.user };
        await setLocalSession(session);
        state.error = undefined;
        await render();
      } catch (e: any) {
        state.error = e?.message || 'Login failed';
        await render();
      }
    });
    document.getElementById('openOptions')?.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.runtime.openOptionsPage();
    });
  } else {
    document.getElementById('logoutBtn')?.addEventListener('click', async () => {
      await setLocalSession(null);
      await render();
    });

    document.getElementById('selectBtn')?.addEventListener('click', async () => {
      state.isSelecting = true;
      await render();
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tabId = tabs[0]?.id;
        if (!tabId) return;
        chrome.tabs.sendMessage(tabId, { type: 'ah:startSelecting' });
      });
    });

    document.getElementById('saveBtn')?.addEventListener('click', async () => {
      state.isSaving = true;
      await render();

      try {
        const session = await getLocalSession();
        const userId = session?.user?.id;
        if (!userId) throw new Error('No user');

        const payload = {
          userId,
          createdAt: new Date().toISOString(),
          meta: { source: 'chrome-extension' },
          fields: state.fields,
          autoLabels: true,
        };

        // Send to backend; backend will upload to Supabase Storage using service key
        const resp = await fetch('http://localhost:3001/api/extension/extract', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.token}`,
          },
          body: JSON.stringify(payload),
        });
        const result = await resp.json();
        if (!resp.ok || !result?.success) throw new Error(result?.error || 'Upload failed');

        state.fields = [];
      } catch (e) {
        console.error(e);
      } finally {
        state.isSaving = false;
        await render();
      }
    });

    root.querySelectorAll('.remove').forEach((el) => {
      el.addEventListener('click', async (ev) => {
        const id = (ev.currentTarget as HTMLElement).getAttribute('data-id');
        if (!id) return;
        state.fields = state.fields.filter(f => f.id !== id);
        await render();
      });
    });
  }
};

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === 'ah:selectionUpdate') {
    state.isSelecting = false;
    const incoming: SelectedField[] = (msg.payload || []).map((f: any) => ({
      id: crypto.randomUUID(),
      label: f.label || 'Field',
      text: f.text,
      xpath: f.xpath,
    }));
    state.fields = mergeByXPath(state.fields, incoming);
    void render();
  }
});

const mergeByXPath = (a: SelectedField[], b: SelectedField[]): SelectedField[] => {
  const map = new Map<string, SelectedField>();
  for (const f of [...a, ...b]) map.set(f.xpath, f);
  return Array.from(map.values());
};

const escapeHtml = (s: string): string => s
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;');

void render();


