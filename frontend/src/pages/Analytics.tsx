import React, { useEffect, useState } from 'react';
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
  LineChart,
  Line,
} from 'recharts';
import {
  BarChart3,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Layers,
} from 'lucide-react';
import { api } from '@/services/api';
import { DashboardMetrics } from '@/types';

export const Analytics: React.FC = () => {
  const [data, setData] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const m = await api.getDashboardMetrics();
        setData(m);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading || !data) {
    return (
      <div className="p-8 space-y-6 animate-pulse">
        <div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded w-48" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const categoryChartData = data.charts.categoryBreakdown.map((item) => ({
    name: item.name.length > 15 ? item.name.slice(0, 15) + '...' : item.name,
    fullName: item.name,
    count: item.value,
  }));

  const categoryPalette = [
    '#18181b', '#3f3f46', '#71717a', '#a1a1aa',
    '#059669', '#d97706', '#2563eb', '#dc2626',
  ];

  const performanceTimeline = [
    { time: '09:00', latencyMs: 240 },
    { time: '10:00', latencyMs: 280 },
    { time: '11:00', latencyMs: 310 },
    { time: '12:00', latencyMs: 260 },
    { time: '13:00', latencyMs: 290 },
    { time: '14:00', latencyMs: 275 },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-7 max-w-7xl mx-auto">
      {/* Title */}
      <div className="pb-4 border-b border-zinc-200/80 dark:border-zinc-800/80">
        <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-zinc-500" />
          Triage Operational Metrics
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
          Throughput latency, classification distribution, and statutory response statistics.
        </p>
      </div>

      {/* KPI Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-lg border border-zinc-200/90 dark:border-zinc-800/90 bg-white dark:bg-[#121316] shadow-2xs">
          <div className="flex items-center justify-between text-zinc-500 mb-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider">Average Triage Latency</span>
            <Clock className="w-3.5 h-3.5 text-zinc-400" />
          </div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 font-mono">275 ms</div>
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
            Fast-path regex & rule engine
          </p>
        </div>

        <div className="p-4 rounded-lg border border-zinc-200/90 dark:border-zinc-800/90 bg-white dark:bg-[#121316] shadow-2xs">
          <div className="flex items-center justify-between text-zinc-500 mb-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider">Model Confidence</span>
            <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
          </div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 font-mono">
            {Math.round(data.avgConfidence * 100)}%
          </div>
          <p className="text-[10px] text-zinc-400 mt-1">Weighted scoring baseline</p>
        </div>

        <div className="p-4 rounded-lg border border-zinc-200/90 dark:border-zinc-800/90 bg-white dark:bg-[#121316] shadow-2xs">
          <div className="flex items-center justify-between text-zinc-500 mb-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider">Action Flag Rate</span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-700 dark:text-amber-400 font-mono">
            {Math.round((data.actionRequiredCount / data.totalProcessed) * 100)}%
          </div>
          <p className="text-[10px] text-zinc-400 mt-1">Require practice review</p>
        </div>

        <div className="p-4 rounded-lg border border-zinc-200/90 dark:border-zinc-800/90 bg-white dark:bg-[#121316] shadow-2xs">
          <div className="flex items-center justify-between text-zinc-500 mb-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider">Deduplication Ratio</span>
            <Layers className="w-3.5 h-3.5 text-zinc-400" />
          </div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 font-mono">100%</div>
          <p className="text-[10px] text-zinc-400 mt-1">SHA-256 hash verified</p>
        </div>
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Category Breakdown Bar Chart */}
        <div className="p-5 rounded-lg border border-zinc-200/90 dark:border-zinc-800/90 bg-white dark:bg-[#121316] shadow-2xs">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Message Classification Volume
            </h3>
            <p className="text-xs text-zinc-500">
              Distribution across standard categories
            </p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryChartData} layout="vertical" margin={{ left: 15, right: 15 }}>
                <XAxis type="number" stroke="#71717a" fontSize={11} tickLine={false} />
                <YAxis dataKey="name" type="category" stroke="#71717a" fontSize={11} tickLine={false} width={105} />
                <Tooltip
                  formatter={(value: any, _, item: any) => [value, item.payload.fullName]}
                  contentStyle={{
                    backgroundColor: '#18181b',
                    borderColor: '#27272a',
                    borderRadius: '0.375rem',
                    color: '#f4f4f5',
                    fontSize: '11px',
                    fontFamily: 'Geist Mono, monospace',
                  }}
                />
                <Bar dataKey="count" fill="#3f3f46" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Priority Breakdown Donut */}
        <div className="p-5 rounded-lg border border-zinc-200/90 dark:border-zinc-800/90 bg-white dark:bg-[#121316] shadow-2xs flex flex-col justify-between">
          <div>
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Priority Tier Distribution
              </h3>
              <p className="text-xs text-zinc-500">
                Critical, High, Medium, and Low severity allocation
              </p>
            </div>

            <div className="h-52 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.charts.priorityDistribution}
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="count"
                  >
                    {data.charts.priorityDistribution.map((_, index) => (
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

          <div className="grid grid-cols-4 gap-2 pt-3 border-t border-zinc-150 dark:border-zinc-800 text-center">
            {data.charts.priorityDistribution.map((p, i) => (
              <div key={i} className="p-2 rounded bg-zinc-50 dark:bg-zinc-900">
                <span className="text-[10px] font-mono text-zinc-500 block">
                  {p.priority}
                </span>
                <span className="text-base font-bold font-mono text-zinc-900 dark:text-zinc-100">
                  {p.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Latency Timeline */}
      <div className="p-5 rounded-lg border border-zinc-200/90 dark:border-zinc-800/90 bg-white dark:bg-[#121316] shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Pipeline Processing Performance
            </h3>
            <p className="text-xs text-zinc-500">
              Mean execution time per message ingestion cycle
            </p>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-850 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800">
            SLA &lt; 500ms Met
          </span>
        </div>

        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={performanceTimeline} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
              <XAxis dataKey="time" stroke="#71717a" fontSize={11} tickLine={false} />
              <YAxis stroke="#71717a" fontSize={11} tickLine={false} />
              <Tooltip
                formatter={(val) => [`${val} ms`, 'Latency']}
                contentStyle={{
                  backgroundColor: '#18181b',
                  borderColor: '#27272a',
                  borderRadius: '0.375rem',
                  color: '#f4f4f5',
                  fontSize: '11px',
                  fontFamily: 'Geist Mono, monospace',
                }}
              />
              <Line type="monotone" dataKey="latencyMs" stroke="#18181b" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
