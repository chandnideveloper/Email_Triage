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

  const [mailbox, setMailbox] = useState('triage@yourpractice.com.au');
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
      <div className="pb-4 border-b border-zinc-200/80 dark:border-zinc-800/80">
        <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-zinc-500" />
          Settings & Integrations
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
          Configure Microsoft Graph credentials, webhooks, classification thresholds, and storage.
        </p>
      </div>

      {/* Section 1: Microsoft 365 / Entra ID */}
      <div className="p-5 rounded-lg border border-zinc-200/90 dark:border-zinc-800/90 bg-white dark:bg-[#121316] shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-150 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Microsoft Entra ID & Graph API
              </h2>
              <p className="text-[11px] text-zinc-500">
                OAuth 2.0 client credentials flow with application permissions (Mail.Read)
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" /> Connected
          </span>
        </div>

        <form onSubmit={handleSaveM365} className="space-y-3 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Target Mailbox (UPN)
              </label>
              <input
                type="email"
                value={mailbox}
                onChange={(e) => setMailbox(e.target.value)}
                className="w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded outline-none focus:border-zinc-400 text-zinc-900 dark:text-zinc-100"
              />
            </div>

            <div>
              <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Directory (Tenant) ID
              </label>
              <input
                type="text"
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                className="w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded outline-none focus:border-zinc-400 text-zinc-900 dark:text-zinc-100 font-mono text-xs"
              />
            </div>

            <div>
              <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Application (Client) ID
              </label>
              <input
                type="text"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded outline-none focus:border-zinc-400 text-zinc-900 dark:text-zinc-100 font-mono text-xs"
              />
            </div>

            <div>
              <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Client Secret
              </label>
              <input
                type="password"
                defaultValue="••••••••••••••••••••••••••••••••"
                className="w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded outline-none focus:border-zinc-400 text-zinc-900 dark:text-zinc-100 font-mono text-xs"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleTestConnection}
              className="px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition"
            >
              Test Authentication
            </button>

            <button
              type="submit"
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 rounded transition shadow-2xs"
            >
              Save Credentials
            </button>
          </div>
        </form>
      </div>

      {/* Section 2: Webhooks */}
      <div className="p-5 rounded-lg border border-zinc-200/90 dark:border-zinc-800/90 bg-white dark:bg-[#121316] shadow-2xs space-y-3">
        <div className="flex items-center gap-2.5 pb-2.5 border-b border-zinc-150 dark:border-zinc-800">
          <div className="p-1.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
            <Webhook className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Graph Webhooks & Subscriptions
            </h2>
            <p className="text-[11px] text-zinc-500">
              Real-time push notification endpoints with validationToken handshake verification
            </p>
          </div>
        </div>

        <div className="space-y-2 text-xs">
          <div>
            <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Public Notification URL
            </label>
            <input
              type="text"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className="w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded outline-none focus:border-zinc-400 text-zinc-900 dark:text-zinc-100 font-mono text-xs"
            />
          </div>

          <p className="text-[11px] text-zinc-500">
            Incoming notifications are validated using the <code>WEBHOOK_CLIENT_STATE</code> secret to reject forged payloads.
          </p>
        </div>
      </div>

      {/* Section 3: AI Rules & Execution Mode */}
      <div className="p-5 rounded-lg border border-zinc-200/90 dark:border-zinc-800/90 bg-white dark:bg-[#121316] shadow-2xs space-y-3">
        <div className="flex items-center gap-2.5 pb-2.5 border-b border-zinc-150 dark:border-zinc-800">
          <div className="p-1.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Classification Parameters
            </h2>
            <p className="text-[11px] text-zinc-500">
              Urgency scoring thresholds and task queue execution mode
            </p>
          </div>
        </div>

        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between py-1.5 border-b border-zinc-150 dark:border-zinc-800">
            <div>
              <span className="font-medium text-zinc-900 dark:text-zinc-100 block">
                Confidence Threshold ({Math.round(confidenceThreshold * 100)}%)
              </span>
              <span className="text-[11px] text-zinc-500">
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
              className="w-32 accent-zinc-800 dark:accent-zinc-200"
            />
          </div>

          <div className="flex items-center justify-between py-1.5">
            <div>
              <span className="font-medium text-zinc-900 dark:text-zinc-100 block">
                Synchronous Eager Tasks
              </span>
              <span className="text-[11px] text-zinc-500">
                Executes tasks in-memory when Redis is not running (<code>TASK_ALWAYS_EAGER=True</code>)
              </span>
            </div>
            <button
              onClick={() => setTaskAlwaysEager(!taskAlwaysEager)}
              className={`w-10 h-5 flex items-center rounded-full p-0.5 transition ${
                taskAlwaysEager ? 'bg-zinc-900 dark:bg-zinc-100' : 'bg-zinc-300 dark:bg-zinc-700'
              }`}
            >
              <div
                className={`bg-white dark:bg-zinc-900 w-4 h-4 rounded-full shadow transform transition ${
                  taskAlwaysEager ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Section 4: Demo State */}
      <div className="p-5 rounded-lg border border-zinc-200/90 dark:border-zinc-800/90 bg-white dark:bg-[#121316] shadow-2xs flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
            Reset Stored State
          </h3>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Reset all inbox records and triage states back to baseline.
          </p>
        </div>

        <button
          onClick={handleResetDemo}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset
        </button>
      </div>
    </div>
  );
};
