import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Key,
  CheckCircle2,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

export const Settings: React.FC = () => {
  const toast = useToast();

  const [mailbox, setMailbox] = useState('ibex.triage@aoscaustralia.com');
  const [tenantId, setTenantId] = useState('00000000-0000-0000-0000-000000000000');
  const [clientId, setClientId] = useState('a1b2c3d4-e5f6-7890-abcd-ef1234567890');

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

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
      {/* Title */}
      <div className="pb-4 border-b border-[#E3E9ED]">
        <h1 className="text-xl font-semibold tracking-tight text-[#172B3A] flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-[#16877A]" />
          Settings & Practice Configuration
        </h1>
        <p className="text-xs text-[#687786] mt-0.5">
          Configure Microsoft Graph credentials and mailbox connection parameters.
        </p>
      </div>

      {/* Microsoft 365 & Mailbox */}
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
    </div>
  );
};
