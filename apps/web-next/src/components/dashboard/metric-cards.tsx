"use client";

import React from "react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";

const trafficData = [
  { value: 10 }, { value: 12 }, { value: 11 }, { value: 15 }, { value: 13 }, { value: 16 }, { value: 20 },
];
const impressionsData = [
  { value: 50 }, { value: 45 }, { value: 55 }, { value: 60 }, { value: 58 }, { value: 65 }, { value: 70 },
];
const backlinksData = [
  { value: 5 }, { value: 7 }, { value: 6 }, { value: 8 }, { value: 9 }, { value: 10 }, { value: 12 },
];

export function CircularProgress({ value, label, subtitle, color, isPositive, percentage }: { value: number, label: string, subtitle: string, color: string, isPositive?: boolean, percentage?: string }) {
  const radius = 35;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between h-full">
      <h3 className="text-slate-800 font-semibold text-sm mb-4">{label}</h3>
      <div className="flex items-center gap-6">
        <div className="relative w-24 h-24 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="48"
              cy="48"
              r={radius}
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              className="text-slate-100"
            />
            <circle
              cx="48"
              cy="48"
              r={radius}
              stroke={color}
              strokeWidth="8"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-slate-900">{value}</span>
            <span className="text-[10px] text-slate-500 font-medium">/100</span>
          </div>
        </div>
        <div>
          <p className={`font-bold text-lg mb-1`} style={{ color }}>{subtitle}</p>
          {percentage && (
            <p className={`text-xs font-semibold ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
              {isPositive ? '+' : ''}{percentage} from last week ↗
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function TrendCard({ label, value, trend, trendValue, color, data, gradientId }: { label: string, value: string, trend: 'up' | 'down', trendValue: string, color: string, data: any[], gradientId: string }) {
  const isPositive = trend === 'up';
  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col h-full">
      <div className="mb-2">
        <h3 className="text-slate-600 font-semibold text-sm mb-2">{label}</h3>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-slate-900">{value}</span>
          <span className={`text-xs font-bold ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
            {isPositive ? '+' : ''}{trendValue}
          </span>
        </div>
      </div>
      
      <div className="h-16 mt-auto -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke={color} 
              strokeWidth={2}
              fillOpacity={1} 
              fill={`url(#${gradientId})`} 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[10px] text-slate-400 mt-2 font-medium">vs last 7 days</p>
    </div>
  );
}

export function MetricCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      <div className="md:col-span-1">
        <CircularProgress 
          label="Overall SEO Score" 
          value={85} 
          subtitle="Great!" 
          color="#10b981" 
          percentage="12" 
          isPositive={true} 
        />
      </div>
      <div className="md:col-span-1">
        <TrendCard 
          label="Organic Traffic" 
          value="24.8K" 
          trend="up" 
          trendValue="18.6%" 
          color="#10b981" 
          data={trafficData}
          gradientId="trafficGradient"
        />
      </div>
      <div className="md:col-span-1">
        <TrendCard 
          label="Total Impressions" 
          value="1.2M" 
          trend="up" 
          trendValue="11.3%" 
          color="#8b5cf6" 
          data={impressionsData}
          gradientId="impressionsGradient"
        />
      </div>
      <div className="md:col-span-1">
        <TrendCard 
          label="Backlinks" 
          value="6.2K" 
          trend="up" 
          trendValue="9.5%" 
          color="#3b82f6" 
          data={backlinksData}
          gradientId="backlinksGradient"
        />
      </div>
      <div className="md:col-span-1">
        <CircularProgress 
          label="AI Visibility Score" 
          value={72} 
          subtitle="" 
          color="#f97316" 
          percentage="14" 
          isPositive={true} 
        />
      </div>
    </div>
  );
}
