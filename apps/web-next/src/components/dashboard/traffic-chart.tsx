"use client";

import React from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const data = [
  { name: 'May 12', organic: 22000, paid: 11000 },
  { name: 'May 13', organic: 20000, paid: 9000 },
  { name: 'May 14', organic: 24000, paid: 10000 },
  { name: 'May 15', organic: 21000, paid: 8500 },
  { name: 'May 16', organic: 25000, paid: 11000 },
  { name: 'May 17', organic: 19000, paid: 8000 },
  { name: 'May 18', organic: 24000, paid: 12000 },
];

export function TrafficChart() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-full">
      <div className="p-5 flex items-center justify-between">
        <h3 className="font-bold text-slate-900">Traffic Overview</h3>
        <select className="text-xs font-semibold text-slate-600 border border-slate-200 rounded-md px-2 py-1 bg-white outline-none">
          <option>Last 7 Days</option>
          <option>Last 30 Days</option>
        </select>
      </div>
      
      <div className="px-5 pb-2 flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-indigo-600"></div>
          <span className="text-xs font-semibold text-slate-600">Organic Traffic</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
          <span className="text-xs font-semibold text-slate-600">Paid Traffic</span>
        </div>
      </div>

      <div className="flex-1 p-5 pt-0 mt-4 min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: '#64748b' }} 
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: '#64748b' }}
              tickFormatter={(value) => `${value / 1000}K`}
            />
            <Tooltip 
              contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Line type="monotone" dataKey="organic" stroke="#4f46e5" strokeWidth={2} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
            <Line type="monotone" dataKey="paid" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
