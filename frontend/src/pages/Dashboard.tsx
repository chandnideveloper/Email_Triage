import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Inbox,
  AlertTriangle,
  Clock,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  Calendar,
  Building,
  FileText,
  ShieldCheck,
  Layers,
  ArrowUpRight,
  Zap,
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
  CartesianGrid,
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

  const loadData = async (isBackground = false) => {
    try {
      if (!isBackground && !data) {
        setLoading(true);
      }
      const metrics = await api.getDashboardMetrics();
      setData(metrics);
    } finally {
      if (!isBackground) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData(true);
    window.addEventListener('triage_updated', handleUpdate);
    return () => window.removeEventListener('triage_updated', handleUpdate);
  }, []);

  if (loading || !data) {
    return (
      <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto animate-pulse">
        <div className="h-6 bg-[#E3E9ED] rounded w-64" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-24 bg-[#E3E9ED] rounded-lg" />
          ))}
        </div>
        <div className="h-64 bg-[#E3E9ED] rounded-lg" />
      </div>
    );
  }

  // Refined enterprise palette for categories (Linear / Ramp / Stripe aesthetic)
  const categoryPalette = [
    '#172B3A', // Primary Navy
    '#16877A', // Primary Teal
    '#547FA5', // Information Blue
    '#D99A38', // Warning Amber
    '#C94F56', // Critical Red
    '#687786', // Secondary Slate
    '#8A99A8', // Neutral Slate
    '#202B35', // Deep Dark
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E3E9ED]">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[#172B3A]">
            Practice Mailbox Overview
          </h1>
          <p className="text-xs text-[#687786] mt-0.5">
            Real-time email ingestion, intelligent classification and financial data extraction.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/inbox')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-[#16877A] hover:bg-[#127267] rounded transition cursor-pointer shadow-2xs"
          >
            <Inbox className="w-3.5 h-3.5" />
            Open Inbox
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total Processed */}
        <div className="p-4 rounded-lg border border-[#E3E9ED] bg-[#FFFFFF] shadow-2xs hover:border-[#B0BEC7] transition">
          <div className="flex items-center justify-between text-[#687786] mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#687786]">Processed</span>
            <Inbox className="w-3.5 h-3.5 text-[#16877A]" />
          </div>
          <div className="text-2xl font-semibold text-[#172B3A] font-mono tracking-tight">
            {data.totalProcessed.toLocaleString()}
          </div>
          <div className="flex items-center gap-1 text-[10px] text-[#16877A] mt-1 font-mono font-medium">
            <TrendingUp className="w-3 h-3" />
            Active Mailbox
          </div>
        </div>

        {/* Unread */}
        <div
          onClick={() => navigate('/inbox?read=unread')}
          className="p-4 rounded-lg border border-[#E3E9ED] bg-[#FFFFFF] shadow-2xs cursor-pointer hover:border-[#16877A] transition"
        >
          <div className="flex items-center justify-between text-[#687786] mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#687786]">Unread</span>
            <span className="w-2 h-2 rounded-full bg-[#16877A]" />
          </div>
          <div className="text-2xl font-semibold text-[#172B3A] font-mono tracking-tight">
            {data.unreadCount}
          </div>
          <p className="text-[10px] text-[#687786] mt-1 font-medium">Awaiting triage</p>
        </div>

        {/* Action Required */}
        <div
          onClick={() => navigate('/inbox?action=true')}
          className="p-4 rounded-lg border border-[#F5E0C2] bg-[#FBF3E6]/60 shadow-2xs cursor-pointer hover:border-[#D99A38] transition"
        >
          <div className="flex items-center justify-between text-[#D99A38] mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Action Req.</span>
            <AlertTriangle className="w-3.5 h-3.5 text-[#D99A38]" />
          </div>
          <div className="text-2xl font-semibold text-[#D99A38] font-mono tracking-tight">
            {data.actionRequiredCount}
          </div>
          <p className="text-[10px] text-[#D99A38] mt-1 font-medium">Attention needed</p>
        </div>

        {/* Critical / P1 */}
        <div
          onClick={() => navigate('/inbox?priority=Critical')}
          className="p-4 rounded-lg border border-[#F7D3D6] bg-[#FBECEE]/60 shadow-2xs cursor-pointer hover:border-[#C94F56] transition"
        >
          <div className="flex items-center justify-between text-[#C94F56] mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Critical / P1</span>
            <Zap className="w-3.5 h-3.5 text-[#C94F56]" />
          </div>
          <div className="text-2xl font-semibold text-[#C94F56] font-mono tracking-tight">
            {data.urgentCount}
          </div>
          <p className="text-[10px] text-[#C94F56] mt-1 font-medium">Statutory deadlines</p>
        </div>

        {/* Client Enquiries */}
        <div
          onClick={() => navigate('/inbox?category=Client+Communication')}
          className="p-4 rounded-lg border border-[#E3E9ED] bg-[#FFFFFF] shadow-2xs hover:border-[#547FA5] transition cursor-pointer"
        >
          <div className="flex items-center justify-between text-[#687786] mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#687786]">Enquiries</span>
            <Clock className="w-3.5 h-3.5 text-[#547FA5]" />
          </div>
          <div className="text-2xl font-semibold text-[#172B3A] font-mono tracking-tight">
            {data.responseRequiredCount}
          </div>
          <p className="text-[10px] text-[#687786] mt-1 font-medium">Client responses</p>
        </div>

        {/* Processing Success Rate */}
        <div className="p-4 rounded-lg border border-[#E3E9ED] bg-[#FFFFFF] shadow-2xs">
          <div className="flex items-center justify-between text-[#687786] mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#687786]">Success Rate</span>
            <ShieldCheck className="w-3.5 h-3.5 text-[#16877A]" />
          </div>
          <div className="text-2xl font-semibold text-[#16877A] font-mono tracking-tight">
            {data.successRate}%
          </div>
          <p className="text-[10px] text-[#687786] mt-1 font-medium">Zero dropped events</p>
        </div>
      </div>

      {/* Daily Practice Briefing */}
      <div className="rounded-lg border border-[#E3E9ED] bg-[#FFFFFF] p-5 shadow-2xs">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E3E9ED]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#16877A]" />
            <h2 className="text-sm font-semibold text-[#172B3A] tracking-tight">
              Daily Practice Briefing
            </h2>
            <span className="text-xs text-[#687786]">• Synthesized from active mailbox</span>
          </div>

          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#F5F7F8] text-[#172B3A] font-medium border border-[#E3E9ED]">
            {data.dailyBrief.importantCount} priority items
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Statutory Deadlines */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#687786] flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#C94F56]" />
              Statutory Deadlines
            </h3>
            {data.dailyBrief.upcomingDeadlines.length === 0 ? (
              <p className="text-xs text-[#687786] italic py-2">No upcoming deadlines.</p>
            ) : (
              <div className="space-y-2">
                {data.dailyBrief.upcomingDeadlines.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => navigate(`/inbox?id=${item.emailId}`)}
                    className="p-3 rounded border border-[#E3E9ED] bg-[#F5F7F8] hover:border-[#16877A] hover:bg-[#FFFFFF] cursor-pointer transition text-xs"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-semibold text-[#C94F56] font-mono text-[11px]">
                        Due {item.dueDate}
                      </span>
                      <PriorityBadge priority={item.priority} size="sm" />
                    </div>
                    <p className="text-[#202B35] font-medium truncate">
                      {item.subject}
                    </p>
                    {item.company && (
                      <span className="text-[11px] text-[#687786] flex items-center gap-1 mt-1 truncate">
                        <Building className="w-3 h-3 text-[#687786]" />
                        {item.company}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Follow-ups */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#687786] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#D99A38]" />
              Active Follow-ups
            </h3>
            {data.dailyBrief.overdueFollowUps.length === 0 ? (
              <p className="text-xs text-[#687786] italic py-2">No pending follow-ups.</p>
            ) : (
              <div className="space-y-2">
                {data.dailyBrief.overdueFollowUps.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => navigate(`/inbox?id=${item.emailId}`)}
                    className="p-3 rounded border border-[#E3E9ED] bg-[#F5F7F8] hover:border-[#16877A] hover:bg-[#FFFFFF] cursor-pointer transition text-xs"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-medium text-[#202B35] truncate">
                        {item.sender}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#FFFFFF] text-[#687786] border border-[#E3E9ED]">
                        {item.daysOverdue}d ago
                      </span>
                    </div>
                    <p className="text-[#687786] truncate">
                      {item.subject}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recommended Actions */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#687786] flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#16877A]" />
              Recommended Actions
            </h3>
            <div className="space-y-2">
              {data.dailyBrief.suggestedActions.slice(0, 2).map((item) => (
                <div
                  key={item.id}
                  onClick={() => navigate(`/inbox?id=${item.emailId}`)}
                  className="p-3 rounded border border-[#E3E9ED] bg-[#F5F7F8] hover:border-[#16877A] hover:bg-[#FFFFFF] cursor-pointer transition text-xs"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <CategoryBadge category={item.category} size="sm" />
                    <PriorityBadge priority={item.priority} size="sm" />
                  </div>
                  <p className="text-[#202B35] font-medium line-clamp-2 mt-1">
                    {item.actionText}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Inbound Message Ingestion Chart */}
        <div className="lg:col-span-2 p-5 rounded-lg border border-[#E3E9ED] bg-[#FFFFFF] shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-[#172B3A] tracking-tight">
                Inbound Message Ingestion
              </h3>
              <p className="text-xs text-[#687786]">
                Total received vs. action-required volume (7-day rolling window)
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-[#687786]">
                <span className="w-2 h-2 rounded-full bg-[#16877A]" />
                Total
              </span>
              <span className="flex items-center gap-1.5 text-[#687786]">
                <span className="w-2 h-2 rounded-full bg-[#C94F56]" />
                Action Required
              </span>
            </div>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.charts.volumeOverTime} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop stopColor="#16877A" stopOpacity={0.18} />
                    <stop stopColor="#16877A" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="actionGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop stopColor="#C94F56" stopOpacity={0.18} />
                    <stop stopColor="#C94F56" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#E3E9ED" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" stroke="#687786" fontSize={11} tickLine={false} />
                <YAxis stroke="#687786" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E3E9ED',
                    borderRadius: '4px',
                    color: '#202B35',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                  }}
                />
                <Area type="monotone" dataKey="count" stroke="#16877A" strokeWidth={2} fill="url(#totalGrad)" />
                <Area type="monotone" dataKey="actionRequired" stroke="#C94F56" strokeWidth={1.5} fill="url(#actionGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Classification Breakdown */}
        <div className="p-5 rounded-lg border border-[#E3E9ED] bg-[#FFFFFF] shadow-2xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[#172B3A] tracking-tight">
              Classification Breakdown
            </h3>
            <p className="text-xs text-[#687786] mb-2">
              Distribution across standard financial categories
            </p>

            <div className="h-48 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.charts.categoryBreakdown}
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {data.charts.categoryBreakdown.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={categoryPalette[index % categoryPalette.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#E3E9ED',
                      borderRadius: '4px',
                      color: '#202B35',
                      fontSize: '11px',
                      fontFamily: 'monospace',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5 pt-3 border-t border-[#E3E9ED] text-[11px]">
            {data.charts.categoryBreakdown.slice(0, 4).map((c, i) => (
              <div key={i} className="flex items-center justify-between text-[#687786]">
                <span className="truncate pr-2">{c.name}</span>
                <span className="font-mono font-semibold text-[#202B35]">{c.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Processing Activity & Engine Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent Messages Feed */}
        <div className="lg:col-span-2 p-5 rounded-lg border border-[#E3E9ED] bg-[#FFFFFF] shadow-2xs">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#E3E9ED]">
            <div>
              <h3 className="text-sm font-semibold text-[#172B3A] tracking-tight">
                Recent Inbound Messages
              </h3>
              <p className="text-xs text-[#687786]">Live feed from monitored mailbox</p>
            </div>
            <button
              onClick={() => navigate('/inbox')}
              className="text-xs font-medium text-[#16877A] hover:underline flex items-center gap-1 transition"
            >
              View all in Inbox <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-[#E3E9ED]">
            {data.recentEmails.map((email) => (
              <div
                key={email.internal_id}
                onClick={() => navigate(`/inbox?id=${email.internal_id}`)}
                className="py-3 flex items-start justify-between gap-3 hover:bg-[#F5F7F8] px-2.5 rounded cursor-pointer transition"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-xs text-[#202B35] truncate">
                      {email.sender_name}
                    </span>
                    <span className="text-[11px] text-[#687786]">•</span>
                    <span className="text-[10px] font-mono text-[#687786]">{formatRelativeTime(email.received_at)}</span>
                    <PriorityBadge priority={email.triage.priority} size="sm" />
                  </div>
                  <p className="text-xs font-medium text-[#202B35] truncate">
                    {email.subject}
                  </p>
                  <p className="text-[11px] text-[#687786] line-clamp-1 mt-0.5">
                    {email.triage.summary}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <CategoryBadge category={email.triage.category} size="sm" />
                  {email.has_attachments && (
                    <span className="text-[10px] text-[#687786] flex items-center gap-1 font-mono bg-[#F5F7F8] border border-[#E3E9ED] px-1.5 py-0.2 rounded">
                      <FileText className="w-3 h-3 text-[#16877A]" />
                      {email.attachments.length} att.
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Engine Pipeline Status */}
        <div className="p-5 rounded-lg border border-[#E3E9ED] bg-[#FFFFFF] shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#E3E9ED]">
              <h3 className="text-sm font-semibold text-[#172B3A] tracking-tight">
                Processing Engine
              </h3>
              <span className="flex items-center gap-1 text-[10px] font-mono font-medium text-[#16877A] bg-[#E8F4F1] px-2 py-0.5 rounded border border-[#C6E6DF]">
                <CheckCircle2 className="w-3 h-3" />
                Operational
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-[#E3E9ED]">
                <span className="text-[#687786]">Target Mailbox</span>
                <span className="font-mono text-[#202B35] truncate max-w-[170px] text-[11px]" title="ibex.triage@aoscaustralia.com">
                  ibex.triage@aoscaustralia.com
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[#E3E9ED]">
                <span className="text-[#687786]">Delta State</span>
                <span className="font-mono text-[#16877A] text-[11px] font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#16877A]" />
                  Synchronized
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[#E3E9ED]">
                <span className="text-[#687786]">Task Queue Driver</span>
                <span className="font-mono text-[#202B35] text-[11px] font-medium">Huey (SQLite)</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[#E3E9ED]">
                <span className="text-[#687786]">Webhook Handler</span>
                <span className="font-mono text-[#547FA5] text-[11px] font-medium">Verified Active</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-[#687786]">Avg Classification Confidence</span>
                <span className="font-mono text-[#16877A] text-[11px] font-semibold">
                  {Math.round(data.avgConfidence * 100)}%
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#E3E9ED]">
            <button
              onClick={() => navigate('/settings')}
              className="w-full py-2 px-3 text-xs font-medium text-[#202B35] bg-[#F5F7F8] hover:bg-[#E3E9ED] border border-[#E3E9ED] rounded transition text-center cursor-pointer"
            >
              Configure Mailbox & Models
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
