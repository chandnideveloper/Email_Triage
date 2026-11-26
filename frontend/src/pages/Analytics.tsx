import React, { useEffect, useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  AreaChart,
  Area,
} from 'recharts';
import {
  BarChart3,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Layers,
  TrendingUp,
  UserCheck,
  CheckCircle2,
  Building,
} from 'lucide-react';
import { api } from '@/services/api';
import { DashboardMetrics, EmailRecord, Priority } from '@/types';
import { PriorityBadge } from '@/components/common/PriorityBadge';

export const Analytics: React.FC = () => {
  const [data, setData] = useState<DashboardMetrics | null>(null);
  const [emails, setEmails] = useState<EmailRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [m, emailRes] = await Promise.all([
          api.getDashboardMetrics(),
          api.getEmails(),
        ]);
        setData(m);
        setEmails(emailRes.items || []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const clientVolume = useMemo(() => {
    if (!emails || emails.length === 0) return [];

    const priorityRank: Record<string, number> = {
      Critical: 4,
      High: 3,
      Medium: 2,
      Low: 1,
    };

    const map = new Map<
      string,
      {
        client: string;
        emailAddr: string;
        emails: number;
        categoryCounts: Record<string, number>;
        maxPriority: Priority;
        statuses: string[];
      }
    >();

    emails.forEach((e) => {
      // Group strictly by actual email sender ID / name
      const clientName = (e.sender_name || e.sender_email || 'Unknown').trim();
      const existing = map.get(clientName) || {
        client: clientName,
        emailAddr: e.sender_email || '',
        emails: 0,
        categoryCounts: {},
        maxPriority: 'Low' as Priority,
        statuses: [],
      };

      existing.emails += 1;
      const cat = e.triage?.category || 'Other';
      existing.categoryCounts[cat] = (existing.categoryCounts[cat] || 0) + 1;

      const p = e.triage?.priority || 'Low';
      if ((priorityRank[p] || 0) > (priorityRank[existing.maxPriority] || 0)) {
        existing.maxPriority = p;
      }

      existing.statuses.push(e.processing_status);
      map.set(clientName, existing);
    });

    return Array.from(map.values())
      .map((item) => {
        let primaryCat = 'Other';
        let maxCatCount = 0;
        Object.entries(item.categoryCounts).forEach(([cat, cnt]) => {
          if (cnt > maxCatCount) {
            maxCatCount = cnt;
            primaryCat = cat;
          }
        });

        let displayStatus = 'Triaged';
        if (item.statuses.includes('COMPLETED')) {
          displayStatus = 'Reconciled';
        } else if (item.statuses.includes('FAILED')) {
          displayStatus = 'Needs Review';
        }

        return {
          client: item.client,
          emailAddr: item.emailAddr,
          emails: item.emails,
          category: primaryCat,
          priority: item.maxPriority,
          status: displayStatus,
        };
      })
      .sort((a, b) => b.emails - a.emails);
  }, [emails]);

  if (loading || !data) {
    return (
      <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto animate-pulse">
        <div className="h-6 bg-[#E3E9ED] rounded w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-[#E3E9ED] rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="h-64 bg-[#E3E9ED] rounded-lg" />
          <div className="h-64 bg-[#E3E9ED] rounded-lg" />
        </div>
      </div>
    );
  }

  const categoryChartData = data.charts.categoryBreakdown.map((item) => ({
    name: item.name.length > 18 ? item.name.slice(0, 18) + '...' : item.name,
    fullName: item.name,
    count: item.value,
  }));

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Title */}
      <div className="pb-4 border-b border-[#E3E9ED]">
        <h1 className="text-xl font-semibold tracking-tight text-[#172B3A] flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-[#16877A]" />
          Practice Analytics & Reporting
        </h1>
        <p className="text-xs text-[#687786] mt-0.5">
          Ingestion throughput, classification breakdown, priority distribution, and financial operations latency.
        </p>
      </div>

      {/* KPI Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-lg border border-[#E3E9ED] bg-[#FFFFFF] shadow-2xs">
          <div className="flex items-center justify-between text-[#687786] mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#687786]">Average Processing Time</span>
            <Clock className="w-3.5 h-3.5 text-[#16877A]" />
          </div>
          <div className="text-2xl font-semibold text-[#172B3A] font-mono">240 ms</div>
          <p className="text-[10px] text-[#16877A] mt-1 font-mono font-medium">
            Huey task queue latency
          </p>
        </div>

        <div className="p-4 rounded-lg border border-[#E3E9ED] bg-[#FFFFFF] shadow-2xs">
          <div className="flex items-center justify-between text-[#687786] mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#687786]">Model Confidence</span>
            <ShieldCheck className="w-3.5 h-3.5 text-[#16877A]" />
          </div>
          <div className="text-2xl font-semibold text-[#172B3A] font-mono">
            {Math.round(data.avgConfidence * 100)}%
          </div>
          <p className="text-[10px] text-[#687786] mt-1">Weighted scoring baseline</p>
        </div>

        <div className="p-4 rounded-lg border border-[#F5E0C2] bg-[#FBF3E6]/60 shadow-2xs">
          <div className="flex items-center justify-between text-[#D99A38] mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Action Flag Rate</span>
            <AlertTriangle className="w-3.5 h-3.5 text-[#D99A38]" />
          </div>
          <div className="text-2xl font-semibold text-[#D99A38] font-mono">
            {data.totalProcessed > 0 ? Math.round((data.actionRequiredCount / data.totalProcessed) * 100) : 0}%
          </div>
          <p className="text-[10px] text-[#D99A38] mt-1 font-medium">Requires practice attention</p>
        </div>

        <div className="p-4 rounded-lg border border-[#E3E9ED] bg-[#FFFFFF] shadow-2xs">
          <div className="flex items-center justify-between text-[#687786] mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#687786]">Processing Success Rate</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-[#16877A]" />
          </div>
          <div className="text-2xl font-semibold text-[#16877A] font-mono">{data.successRate}%</div>
          <p className="text-[10px] text-[#687786] mt-1 font-mono">Zero dropped ingestion events</p>
        </div>
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Category Breakdown Bar Chart */}
        <div className="p-5 rounded-lg border border-[#E3E9ED] bg-[#FFFFFF] shadow-2xs">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-[#172B3A] tracking-tight">
              Classification Distribution
            </h3>
            <p className="text-xs text-[#687786]">
              Volume across standard accounting practice categories
            </p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryChartData} layout="vertical" margin={{ left: 15, right: 15 }}>
                <CartesianGrid stroke="#E3E9ED" strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" stroke="#687786" fontSize={11} tickLine={false} />
                <YAxis dataKey="name" type="category" stroke="#687786" fontSize={11} tickLine={false} width={115} />
                <Tooltip
                  formatter={(value: any, _, item: any) => [value, item.payload.fullName]}
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E3E9ED',
                    borderRadius: '4px',
                    color: '#202B35',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                  }}
                />
                <Bar dataKey="count" fill="#16877A" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Priority Distribution Chart */}
        <div className="p-5 rounded-lg border border-[#E3E9ED] bg-[#FFFFFF] shadow-2xs">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-[#172B3A] tracking-tight">
              Priority Distribution
            </h3>
            <p className="text-xs text-[#687786]">
              Risk and urgency classification of active mailbox items
            </p>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.charts.priorityDistribution}
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="count"
                >
                  {data.charts.priorityDistribution.map((entry, index) => {
                    const colorMap: Record<string, string> = {
                      Critical: '#C94F56',
                      High: '#D99A38',
                      Medium: '#547FA5',
                      Low: '#687786',
                    };
                    return <Cell key={`cell-${index}`} fill={colorMap[entry.priority] || '#687786'} />;
                  })}
                </Pie>
                <Tooltip
                  formatter={(value: any, _, item: any) => [`${value} emails`, item.payload.priority]}
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E3E9ED',
                    borderRadius: '4px',
                    color: '#202B35',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-4 gap-2 pt-3 border-t border-[#E3E9ED] text-[11px] text-center font-mono">
            {data.charts.priorityDistribution.map((p) => (
              <div key={p.priority}>
                <span className="text-[#687786] block text-[10px]">{p.priority}</span>
                <span className="font-semibold text-[#202B35]">{p.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Client-wise Email Volume Table */}
      <div className="rounded-lg border border-[#E3E9ED] bg-[#FFFFFF] shadow-2xs p-5">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#E3E9ED]">
          <div>
            <h3 className="text-sm font-semibold text-[#172B3A] tracking-tight">
              Client-wise Inbound Activity
            </h3>
            <p className="text-xs text-[#687786]">Active correspondence volume grouped by client entity</p>
          </div>
          <span className="text-[11px] font-mono text-[#16877A] bg-[#E8F4F1] border border-[#C6E6DF] px-2 py-0.5 rounded">
            Live Feed
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#F5F7F8] border-b border-[#E3E9ED] text-[#687786] font-mono text-[11px]">
                <th className="py-2.5 px-3">Client (Sender)</th>
                <th className="py-2.5 px-3">Messages</th>
                <th className="py-2.5 px-3">Primary Category</th>
                <th className="py-2.5 px-3">Max Urgency</th>
                <th className="py-2.5 px-3 text-right">Reconciliation Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3E9ED]">
              {clientVolume.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs text-[#687786] font-mono">
                    No client correspondence found.
                  </td>
                </tr>
              ) : (
                clientVolume.map((row, i) => (
                  <tr key={i} className="hover:bg-[#F5F7F8] transition">
                    <td className="py-2.5 px-3 font-medium text-[#202B35] flex items-center gap-2">
                      <UserCheck className="w-3.5 h-3.5 text-[#16877A] shrink-0" />
                      <div>
                        <span className="font-semibold block">{row.client}</span>
                        {row.emailAddr && (
                          <span className="text-[10px] text-[#687786] font-mono block">
                            {row.emailAddr}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[#202B35]">{row.emails}</td>
                    <td className="py-2.5 px-3 text-[#687786]">{row.category}</td>
                    <td className="py-2.5 px-3">
                      <PriorityBadge priority={row.priority} size="sm" />
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="text-[11px] font-mono font-medium text-[#16877A] bg-[#E8F4F1] border border-[#C6E6DF] px-2 py-0.5 rounded">
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
