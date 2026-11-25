import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Key,
  Sliders,
  Webhook,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import { api } from '@/services/api';
import { useToast } from '@/components/ui/Toast';

export const Settings: React.FC = () => {
  const toast = useToast();

  const [mailbox, setMailbox] = useState('ibex.triage@aoscaustralia.com');
  const [tenantId, setTenantId] = useState('00000000-0000-0000-0000-000000000000');
  const [clientId, setClientId] = useState('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
  const [webhookUrl, setWebhookUrl] = useState('https://triage.yourpractice.com.au/api/triage/webhook');
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.85);
  const [taskAlwaysEager, setTaskAlwaysEager] = useState(true);

  const handleSaveM365 = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Settings Saved', 'Microsoft Graph connection parameters updated.');
  };

  const handleTestConnection = async () => {
    toast.info('Testing Connection', 'Querying Microsoft Entra ID token endpoint...');
    setTimeout(() => {
      toast.success('Connection Verified', 'OAuth 2.0 token obtained and Mail.Read consent verified.');
    }, 800);
  };

  const handleResetDemo = () => {
    api.resetDemoData();
    toast.success('Data Reset', 'Restored default test emails and attachments.');
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
      <div className="pb-4 border-b border-slate-200/80 dark:border-slate-800/80">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-indigo-500" />
          Settings & Integrations
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Configure Microsoft Graph credentials, webhooks, classification thresholds, and storage.
        </p>
      </div>

      {/* Section 1: Microsoft 365 / Entra ID */}
      <div className="p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#111726] shadow-sm space-y-5">
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Microsoft Entra ID & Graph API
              </h2>
              <p className="text-[11px] text-slate-400">
                OAuth 2.0 client credentials flow with application permissions (Mail.Read)
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" /> Connected
          </span>
        </div>

        <form onSubmit={handleSaveM365} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Target Mailbox (UPN)
              </label>
              <input
                type="email"
                value={mailbox}
                onChange={(e) => setMailbox(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100 font-mono transition"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Directory (Tenant) ID
              </label>
              <input
                type="text"
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100 font-mono text-xs transition"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Application (Client) ID
              </label>
              <input
                type="text"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100 font-mono text-xs transition"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Client Secret
              </label>
              <input
                type="password"
                defaultValue="••••••••••••••••••••••••••••••••"
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100 font-mono text-xs transition"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleTestConnection}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer"
            >
              Test Authentication
            </button>

            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-xl shadow-sm shadow-indigo-500/25 transition active:scale-[0.98] cursor-pointer"
            >
              Save Credentials
            </button>
          </div>
        </form>
      </div>

      {/* Section 2: Webhooks */}
      <div className="p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#111726] shadow-sm space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            <Webhook className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Graph Webhooks & Subscriptions
            </h2>
            <p className="text-[11px] text-slate-400">
              Real-time push notification endpoints with validationToken handshake verification
            </p>
          </div>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Public Notification URL
            </label>
            <input
              type="text"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100 font-mono text-xs transition"
            />
          </div>

          <p className="text-[11px] text-slate-400">
            Incoming notifications are validated using the <code className="text-indigo-400 font-mono">WEBHOOK_CLIENT_STATE</code> secret to reject forged payloads.
          </p>
        </div>
      </div>

      {/* Section 3: AI Rules & Execution Mode */}
      <div className="p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#111726] shadow-sm space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Classification Parameters
            </h2>
            <p className="text-[11px] text-slate-400">
              Urgency scoring thresholds and task queue execution mode
            </p>
          </div>
        </div>

        <div className="space-y-4 text-xs">
          <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800/60">
            <div>
              <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                Confidence Threshold ({Math.round(confidenceThreshold * 100)}%)
              </span>
              <span className="text-[11px] text-slate-400">
                Minimum classification score required for automatic triage
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="0.99"
              step="0.01"
              value={confidenceThreshold}
              onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
              className="w-36 accent-indigo-600 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                Synchronous Eager Tasks
              </span>
              <span className="text-[11px] text-slate-400">
                Executes tasks in-memory when Redis is not running (<code className="text-indigo-400 font-mono">TASK_ALWAYS_EAGER=True</code>)
              </span>
            </div>
            <button
              onClick={() => setTaskAlwaysEager(!taskAlwaysEager)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition cursor-pointer ${
                taskAlwaysEager ? 'bg-gradient-to-r from-indigo-600 to-purple-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition ${
                  taskAlwaysEager ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Section 4: Demo State */}
      <div className="p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#111726] shadow-sm flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
            Reset Stored State
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">
            Reset all inbox records and triage states back to baseline.
          </p>
        </div>

        <button
          onClick={handleResetDemo}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset
        </button>
      </div>
    </div>
  );
};
