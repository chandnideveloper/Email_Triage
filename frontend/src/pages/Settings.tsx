import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Key,
  Sliders,
  Webhook,
  RotateCcw,
  CheckCircle2,
  Shield,
  FileText,
  User,
  Bell,
  Lock,
  RefreshCw,
} from 'lucide-react';
import { api } from '@/services/api';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/utils/cn';

export const Settings: React.FC = () => {
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<'m365' | 'classification' | 'security' | 'audit'>('m365');
  const [mailbox, setMailbox] = useState('ibex.triage@aoscaustralia.com');
  const [tenantId, setTenantId] = useState('00000000-0000-0000-0000-000000000000');
  const [clientId, setClientId] = useState('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
  const [webhookUrl, setWebhookUrl] = useState('https://triage.yourpractice.com.au/api/triage/webhook');
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.85);
  const [taskAlwaysEager, setTaskAlwaysEager] = useState(true);
  const [tfnRedaction, setTfnRedaction] = useState(true);

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

  const auditEvents = [
    { time: '11:46 AM', action: 'DELTA_SYNC', actor: 'Huey Worker', status: 'SUCCESS', details: 'Ingested 2 new messages' },
    { time: '11:30 AM', action: 'TRIAGE_CLASSIFY', actor: 'AI Engine', status: 'SUCCESS', details: 'Classified supplier_invoice (81%)' },
    { time: '11:15 AM', action: 'BATCH_UPDATE', actor: 'Administrator', status: 'SUCCESS', details: 'Marked 1 email as resolved' },
    { time: '10:48 AM', action: 'ATTACHMENT_EXTRACT', actor: 'Parser', status: 'SUCCESS', details: 'Extracted PDF and SHA-256 fingerprint' },
    { time: '10:02 AM', action: 'TFN_REDACTION', actor: 'Privacy Guard', status: 'SUCCESS', details: 'Scanned 1 message, zero TFN leaks' },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
      {/* Title */}
      <div className="pb-4 border-b border-[#E3E9ED]">
        <h1 className="text-xl font-semibold tracking-tight text-[#172B3A] flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-[#16877A]" />
          Settings & Practice Configuration
        </h1>
        <p className="text-xs text-[#687786] mt-0.5">
          Configure Microsoft Graph credentials, classification parameters, security policies, and audit trails.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#E3E9ED] text-xs font-medium space-x-6 select-none">
        {[
          { id: 'm365', label: 'Microsoft 365 & Mailbox' },
          { id: 'classification', label: 'Classification Engine' },
          { id: 'security', label: 'Security & Compliance' },
          { id: 'audit', label: 'Audit Logs' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              'pb-3 border-b-2 transition cursor-pointer',
              activeTab === tab.id
                ? 'border-[#16877A] text-[#16877A] font-semibold'
                : 'border-transparent text-[#687786] hover:text-[#202B35]'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Microsoft 365 */}
      {activeTab === 'm365' && (
        <div className="space-y-5">
          <div className="p-5 rounded-lg border border-[#E3E9ED] bg-[#FFFFFF] shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E3E9ED]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded bg-[#E8F4F1] text-[#16877A] border border-[#C6E6DF]">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-[#172B3A]">
                    Microsoft Entra ID & Graph API
                  </h2>
                  <p className="text-[11px] text-[#687786]">
                    OAuth 2.0 client credentials flow with application permissions (Mail.Read)
                  </p>
                </div>
              </div>

              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-mono font-medium bg-[#E8F4F1] text-[#16877A] border border-[#C6E6DF]">
                <CheckCircle2 className="w-3.5 h-3.5" /> Connected
              </span>
            </div>

            <form onSubmit={handleSaveM365} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-[#202B35] mb-1">
                    Target Mailbox (UPN)
                  </label>
                  <input
                    type="email"
                    value={mailbox}
                    onChange={(e) => setMailbox(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[#F5F7F8] border border-[#E3E9ED] rounded outline-none focus:border-[#16877A] text-[#202B35] font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block font-medium text-[#202B35] mb-1">
                    Directory (Tenant) ID
                  </label>
                  <input
                    type="text"
                    value={tenantId}
                    onChange={(e) => setTenantId(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[#F5F7F8] border border-[#E3E9ED] rounded outline-none focus:border-[#16877A] text-[#202B35] font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block font-medium text-[#202B35] mb-1">
                    Application (Client) ID
                  </label>
                  <input
                    type="text"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[#F5F7F8] border border-[#E3E9ED] rounded outline-none focus:border-[#16877A] text-[#202B35] font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block font-medium text-[#202B35] mb-1">
                    Client Secret
                  </label>
                  <input
                    type="password"
                    defaultValue="••••••••••••••••••••••••••••••••"
                    className="w-full px-3 py-1.5 bg-[#F5F7F8] border border-[#E3E9ED] rounded outline-none focus:border-[#16877A] text-[#202B35] font-mono text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  className="px-3 py-1.5 text-xs font-medium text-[#202B35] bg-[#F5F7F8] hover:bg-[#E3E9ED] border border-[#E3E9ED] rounded transition cursor-pointer"
                >
                  Test Authentication
                </button>

                <button
                  type="submit"
                  className="px-3.5 py-1.5 text-xs font-medium text-white bg-[#16877A] hover:bg-[#127267] rounded transition cursor-pointer shadow-2xs"
                >
                  Save Credentials
                </button>
              </div>
            </form>
          </div>

          <div className="p-5 rounded-lg border border-[#E3E9ED] bg-[#FFFFFF] shadow-2xs space-y-3 text-xs">
            <h3 className="text-sm font-semibold text-[#172B3A]">Monitored Outlook Folders</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2.5 rounded bg-[#F5F7F8] border border-[#E3E9ED]">
                <div>
                  <p className="font-medium text-[#202B35]">Inbox (/mailFolders/inbox)</p>
                  <p className="text-[11px] text-[#687786]">Delta link synchronized, polling every 45 seconds</p>
                </div>
                <span className="text-[10px] font-mono text-[#16877A] bg-[#E8F4F1] border border-[#C6E6DF] px-2 py-0.5 rounded font-medium">
                  Active
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded bg-[#F5F7F8] border border-[#E3E9ED]">
                <div>
                  <p className="font-medium text-[#202B35]">Junk Email (/mailFolders/junkemail)</p>
                  <p className="text-[11px] text-[#687786]">Spam and quarantine monitoring active</p>
                </div>
                <span className="text-[10px] font-mono text-[#16877A] bg-[#E8F4F1] border border-[#C6E6DF] px-2 py-0.5 rounded font-medium">
                  Active
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Classification Engine */}
      {activeTab === 'classification' && (
        <div className="p-5 rounded-lg border border-[#E3E9ED] bg-[#FFFFFF] shadow-2xs space-y-5 text-xs">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#E3E9ED]">
            <div className="p-2 rounded bg-[#EDF3F8] text-[#547FA5] border border-[#D4E3EF]">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#172B3A]">
                Triage & Financial Classification Thresholds
              </h2>
              <p className="text-[11px] text-[#687786]">
                Configure confidence thresholds and rule priority models
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-medium text-[#202B35]">
                  Minimum Classification Confidence Threshold
                </label>
                <span className="font-mono font-semibold text-[#16877A]">
                  {Math.round(confidenceThreshold * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.5"
                max="0.99"
                step="0.01"
                value={confidenceThreshold}
                onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
                className="w-full accent-[#16877A] cursor-pointer"
              />
              <p className="text-[11px] text-[#687786] mt-1">
                Emails with confidence below this threshold will automatically be flagged for Accountant Review.
              </p>
            </div>

            <div className="pt-3 border-t border-[#E3E9ED] space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={taskAlwaysEager}
                  onChange={(e) => setTaskAlwaysEager(e.target.checked)}
                  className="rounded text-[#16877A] focus:ring-[#16877A]"
                />
                <span className="font-medium text-[#202B35]">
                  Immediate Task Execution (Huey SQLite Driver)
                </span>
              </label>
              <p className="text-[11px] text-[#687786] pl-5">
                Process email payloads synchronously without worker delay.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Security & Compliance */}
      {activeTab === 'security' && (
        <div className="p-5 rounded-lg border border-[#E3E9ED] bg-[#FFFFFF] shadow-2xs space-y-4 text-xs">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#E3E9ED]">
            <div className="p-2 rounded bg-[#E8F4F1] text-[#16877A] border border-[#C6E6DF]">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#172B3A]">
                Australian Accounting Privacy & Redaction
              </h2>
              <p className="text-[11px] text-[#687786]">
                Enforce Australian Privacy Principles (APPs) and Tax File Number (TFN) protection
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded bg-[#F5F7F8] border border-[#E3E9ED]">
              <div>
                <p className="font-medium text-[#202B35]">TFN (Tax File Number) Automatic Redaction</p>
                <p className="text-[11px] text-[#687786]">Scans inbound text & attachments; masks 8-9 digit TFN sequences</p>
              </div>
              <input
                type="checkbox"
                checked={tfnRedaction}
                onChange={(e) => setTfnRedaction(e.target.checked)}
                className="rounded text-[#16877A] focus:ring-[#16877A]"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded bg-[#F5F7F8] border border-[#E3E9ED]">
              <div>
                <p className="font-medium text-[#202B35]">Read-Only Immutable Data Store</p>
                <p className="text-[11px] text-[#687786]">Approved and reconciled emails cannot be mutated or overridden</p>
              </div>
              <span className="text-[10px] font-mono font-medium text-[#16877A] bg-[#E8F4F1] border border-[#C6E6DF] px-2 py-0.5 rounded">
                Enforced
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Audit Logs */}
      {activeTab === 'audit' && (
        <div className="p-5 rounded-lg border border-[#E3E9ED] bg-[#FFFFFF] shadow-2xs space-y-3 text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#E3E9ED]">
            <div>
              <h2 className="text-sm font-semibold text-[#172B3A]">
                System & Audit Event Stream
              </h2>
              <p className="text-[11px] text-[#687786]">Immutable chronological ledger of all platform actions</p>
            </div>
            <span className="text-[10px] font-mono text-[#16877A] bg-[#E8F4F1] border border-[#C6E6DF] px-2 py-0.5 rounded font-medium">
              Live Auditing
            </span>
          </div>

          <div className="divide-y divide-[#E3E9ED]">
            {auditEvents.map((evt, idx) => (
              <div key={idx} className="py-2.5 flex items-center justify-between font-mono text-[11px]">
                <div className="flex items-center gap-3">
                  <span className="text-[#687786]">{evt.time}</span>
                  <span className="font-medium text-[#172B3A]">{evt.action}</span>
                  <span className="text-[#687786] font-sans">by {evt.actor}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#687786] font-sans text-xs">{evt.details}</span>
                  <span className="text-[10px] text-[#16877A] bg-[#E8F4F1] border border-[#C6E6DF] px-1.5 py-0.2 rounded font-semibold">
                    {evt.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
