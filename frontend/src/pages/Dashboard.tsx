import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Inbox,
  AlertTriangle,
  Clock,
  ArrowRight,
  TrendingUp,
  Zap,
  CheckCircle2,
  Calendar,
  Building,
  FileText,
  ShieldCheck,
  ArrowUpRight,
  Layers,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { api } from '@/services/api';
import { DashboardMetrics } from '@/types';
import { PriorityBadge } from '@/components/common/PriorityBadge';
import { CategoryBadge } from '@/components/common/CategoryBadge';
import { formatRelativeTime } from '@/utils/formatters';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const metrics = await api.getDashboardMetrics();
      setData(metrics);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading || !data) {
    return (
      <div className="p-8 space-y-6 animate-pulse">
        <div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded w-48" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-24 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  // Refined architectural palette for category chart (Linear / Stripe style)
  const categoryPalette = [
    '#18181b', // zinc-900
    '#dc2626', // red-600
    '#059669', // emerald-600
    '#d97706', // amber-600
    '#2563eb', // blue-600
    '#71717a', // zinc-500
    '#9333ea', // purple-600
    '#ea580c', // orange-600
  ];

  return (
    <div className="p-6 lg:p-8 space-y-7 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200/80 dark:border-zinc-800/80">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Practice Mailbox Overview
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Real-time Microsoft Outlook ingestion, classification, and client financial data extraction.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/inbox')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 rounded-md transition active:scale-[0.98] shadow-2xs"
          >
            <Inbox className="w-3.5 h-3.5" />
            Open Inbox
          </button>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Processed */}
        <div className="p-3.5 rounded-lg border border-zinc-200/90 dark:border-zinc-800/90 bg-white dark:bg-[#121316] shadow-2xs">
          <div className="flex items-center justify-between text-zinc-500 mb-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider">Processed</span>
            <Inbox className="w-3.5 h-3.5 text-zinc-400" />
          </div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 font-mono tracking-tight">
            {data.totalProcessed.toLocaleString()}
          </div>
          <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
            <TrendingUp className="w-3 h-3" />
            +18% MTD
          </div>
        </div>

        {/* Unread */}
        <div
          onClick={() => navigate('/inbox?read=unread')}
          className="p-3.5 rounded-lg border border-zinc-200/90 dark:border-zinc-800/90 bg-white dark:bg-[#121316] shadow-2xs cursor-pointer hover:border-zinc-400 dark:hover:border-zinc-700 transition"
        >
          <div className="flex items-center justify-between text-zinc-500 mb-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider">Unread</span>
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-900 dark:bg-zinc-100" />
          </div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 font-mono tracking-tight">
            {data.unreadCount}
          </div>
          <p className="text-[10px] text-zinc-400 mt-1">Awaiting triage</p>
        </div>

        {/* Action Required */}
        <div
          onClick={() => navigate('/inbox?action=true')}
          className="p-3.5 rounded-lg border border-amber-500/30 bg-amber-50/20 dark:bg-amber-950/10 shadow-2xs cursor-pointer hover:border-amber-500/50 transition"
        >
          <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 mb-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider">Action Req.</span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-800 dark:text-amber-300 font-mono tracking-tight">
            {data.actionRequiredCount}
          </div>
          <p className="text-[10px] text-amber-700/80 dark:text-amber-400/80 mt-1 font-medium">Attention needed</p>
        </div>

        {/* Urgent / P1 */}
        <div
          onClick={() => navigate('/inbox?priority=Critical')}
          className="p-3.5 rounded-lg border border-red-500/30 bg-red-50/20 dark:bg-red-950/10 shadow-2xs cursor-pointer hover:border-red-500/50 transition"
        >
          <div className="flex items-center justify-between text-red-700 dark:text-red-400 mb-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider">Urgent / P1</span>
            <Zap className="w-3.5 h-3.5 text-red-600" />
          </div>
          <div className="text-2xl font-bold text-red-800 dark:text-red-300 font-mono tracking-tight">
            {data.urgentCount}
          </div>
          <p className="text-[10px] text-red-700/80 dark:text-red-400/80 mt-1 font-medium">Statutory deadlines</p>
        </div>

        {/* Awaiting Response */}
        <div
          onClick={() => navigate('/inbox?category=Client+Communication')}
          className="p-3.5 rounded-lg border border-zinc-200/90 dark:border-zinc-800/90 bg-white dark:bg-[#121316] shadow-2xs hover:border-zinc-400 dark:hover:border-zinc-700 transition"
        >
          <div className="flex items-center justify-between text-zinc-500 mb-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider">Enquiries</span>
            <Clock className="w-3.5 h-3.5 text-zinc-400" />
          </div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 font-mono tracking-tight">
            {data.responseRequiredCount}
          </div>
          <p className="text-[10px] text-zinc-400 mt-1">Client responses</p>
        </div>

        {/* Processing Reliability */}
        <div className="p-3.5 rounded-lg border border-zinc-200/90 dark:border-zinc-800/90 bg-white dark:bg-[#121316] shadow-2xs">
          <div className="flex items-center justify-between text-zinc-500 mb-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider">Parser Uptime</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 font-mono tracking-tight">
            {data.successRate}%
          </div>
          <p className="text-[10px] text-zinc-400 mt-1">Zero dropped events</p>
        </div>
      </div>

      {/* Executive Briefing Section - Clean, editorial styling */}
      <div className="rounded-lg border border-zinc-200/90 dark:border-zinc-800/90 bg-white dark:bg-[#121316] p-5 shadow-2xs">
        <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-zinc-150 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-zinc-900 dark:bg-zinc-100" />
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Daily Practice Briefing
            </h2>
            <span className="text-xs text-zinc-400">• Synthesized from active mailbox</span>
          </div>

          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-850 text-zinc-600 dark:text-zinc-400 font-medium">
            {data.dailyBrief.importantCount} priority items
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Upcoming Deadlines */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
              <Calendar className="w-3 h-3 text-zinc-400" />
              Statutory Deadlines
            </h3>
            {data.dailyBrief.upcomingDeadlines.length === 0 ? (
              <p className="text-xs text-zinc-400 italic">No upcoming deadlines.</p>
            ) : (
              <div className="space-y-2">
                {data.dailyBrief.upcomingDeadlines.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => navigate(`/inbox?id=${item.emailId}`)}
                    className="p-2.5 rounded-md bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 cursor-pointer transition text-xs"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-red-600 dark:text-red-400 font-mono text-[11px]">
                        Due {item.dueDate}
                      </span>
                      <PriorityBadge priority={item.priority} size="sm" />
                    </div>
                    <p className="text-zinc-800 dark:text-zinc-200 font-medium truncate">
                      {item.subject}
                    </p>
                    {item.company && (
                      <span className="text-[11px] text-zinc-500 flex items-center gap-1 mt-1 truncate">
                        <Building className="w-3 h-3 text-zinc-400" />
                        {item.company}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending Follow-ups */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-zinc-400" />
              Active Follow-ups
            </h3>
            {data.dailyBrief.overdueFollowUps.length === 0 ? (
              <p className="text-xs text-zinc-400 italic">No pending follow-ups.</p>
            ) : (
              <div className="space-y-2">
                {data.dailyBrief.overdueFollowUps.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => navigate(`/inbox?id=${item.emailId}`)}
                    className="p-2.5 rounded-md bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 cursor-pointer transition text-xs"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                        {item.sender}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500">
                        {item.daysOverdue}d ago
                      </span>
                    </div>
                    <p className="text-zinc-600 dark:text-zinc-400 font-medium truncate">
                      {item.subject}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Suggested Next Steps */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
              <Layers className="w-3 h-3 text-zinc-400" />
              Recommended Actions
            </h3>
            <div className="space-y-2">
              {data.dailyBrief.suggestedActions.slice(0, 2).map((item) => (
                <div
                  key={item.id}
                  onClick={() => navigate(`/inbox?id=${item.emailId}`)}
                  className="p-2.5 rounded-md bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 cursor-pointer transition text-xs"
                >
                  <div className="flex items-center justify-between mb-1">
                    <CategoryBadge category={item.category} size="sm" />
                    <PriorityBadge priority={item.priority} size="sm" />
                  </div>
                  <p className="text-zinc-800 dark:text-zinc-200 font-medium line-clamp-2 mt-1">
                    {item.actionText}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Email Volume Chart */}
        <div className="lg:col-span-2 p-5 rounded-lg border border-zinc-200/90 dark:border-zinc-800/90 bg-white dark:bg-[#121316] shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Inbound Message Ingestion
              </h3>
              <p className="text-xs text-zinc-500">
                Total received vs. action-flagged volume (7-day window)
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                <span className="w-2 h-2 rounded-full bg-zinc-900 dark:bg-zinc-100" />
                Total
              </span>
              <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                <span className="w-2 h-2 rounded-full bg-red-600" />
                Action Required
              </span>
            </div>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.charts.volumeOverTime} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop stopColor="#71717a" stopOpacity={0.15} />
                    <stop stopColor="#71717a" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="actionGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop stopColor="#dc2626" stopOpacity={0.2} />
                    <stop stopColor="#dc2626" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#71717a" fontSize={11} tickLine={false} />
                <YAxis stroke="#71717a" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    borderColor: '#27272a',
                    borderRadius: '0.375rem',
                    color: '#f4f4f5',
                    fontSize: '11px',
                    fontFamily: 'Geist Mono, monospace',
                  }}
                />
                <Area type="monotone" dataKey="count" stroke="#52525b" strokeWidth={2} fill="url(#totalGrad)" />
                <Area type="monotone" dataKey="actionRequired" stroke="#dc2626" strokeWidth={1.5} fill="url(#actionGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="p-5 rounded-lg border border-zinc-200/90 dark:border-zinc-800/90 bg-white dark:bg-[#121316] shadow-2xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Classification Breakdown
            </h3>
            <p className="text-xs text-zinc-500 mb-2">
              Distribution across standard practice categories
            </p>

            <div className="h-48 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.charts.categoryBreakdown}
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {data.charts.categoryBreakdown.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={categoryPalette[index % categoryPalette.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181b',
                      borderColor: '#27272a',
                      borderRadius: '0.375rem',
                      color: '#f4f4f5',
                      fontSize: '11px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5 pt-3 border-t border-zinc-150 dark:border-zinc-800 text-[11px]">
            {data.charts.categoryBreakdown.slice(0, 4).map((c, i) => (
              <div key={i} className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                <span className="truncate pr-2">{c.name}</span>
                <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">{c.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Inflow & Engine State */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent Inflow List */}
        <div className="lg:col-span-2 p-5 rounded-lg border border-zinc-200/90 dark:border-zinc-800/90 bg-white dark:bg-[#121316] shadow-2xs">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-150 dark:border-zinc-800">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Recent Inbound Messages
              </h3>
              <p className="text-xs text-zinc-500">Live feed from target mailbox</p>
            </div>
            <button
              onClick={() => navigate('/inbox')}
              className="text-xs font-medium text-zinc-900 dark:text-zinc-200 hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-zinc-100 dark:divide-zinc-850">
            {data.recentEmails.map((email) => (
              <div
                key={email.internal_id}
                onClick={() => navigate(`/inbox?id=${email.internal_id}`)}
                className="py-2.5 flex items-start justify-between gap-3 hover:bg-zinc-50/80 dark:hover:bg-zinc-850/40 px-2 -mx-2 rounded cursor-pointer transition"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 truncate">
                      {email.sender_name}
                    </span>
                    <span className="text-[11px] text-zinc-400">•</span>
                    <span className="text-[10px] font-mono text-zinc-400">{formatRelativeTime(email.received_at)}</span>
                    <PriorityBadge priority={email.triage.priority} size="sm" />
                  </div>
                  <p className="text-xs font-medium text-zinc-800 dark:text-zinc-300 truncate">
                    {email.subject}
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-1 mt-0.5">
                    {email.triage.summary}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                  <CategoryBadge category={email.triage.category} size="sm" />
                  {email.has_attachments && (
                    <span className="text-[10px] text-zinc-400 flex items-center gap-0.5 font-mono">
                      <FileText className="w-3 h-3 text-zinc-400" />
                      {email.attachments.length} att.
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Engine Pipeline Diagnostics */}
        <div className="p-5 rounded-lg border border-zinc-200/90 dark:border-zinc-800/90 bg-white dark:bg-[#121316] shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-150 dark:border-zinc-800">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Sync Pipeline
              </h3>
              <span className="flex items-center gap-1 text-[10px] font-mono font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3" />
                Active
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-850">
                <span className="text-zinc-500">Target Mailbox</span>
                <span className="font-mono text-zinc-800 dark:text-zinc-200 truncate max-w-[140px] text-[11px]">
                  triage@yourpractice.com.au
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-850">
                <span className="text-zinc-500">Delta Token State</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 text-[11px]">Synchronized</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-850">
                <span className="text-zinc-500">Queue Driver</span>
                <span className="font-mono text-zinc-800 dark:text-zinc-200 text-[11px]">Celery + Redis</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-zinc-500">Graph Webhooks</span>
                <span className="font-mono text-zinc-800 dark:text-zinc-200 text-[11px]">Handshake Verified</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-150 dark:border-zinc-800">
            <button
              onClick={() => navigate('/settings')}
              className="w-full py-1.5 px-3 text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-850 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded transition text-center"
            >
              Manage Integrations & Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
