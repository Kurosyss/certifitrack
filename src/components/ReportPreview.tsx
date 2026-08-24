import React from 'react';
import { AlertCircle, Clock, Search, MoreHorizontal, FileText, CheckCircle2 } from 'lucide-react';

export function ReportPreview() {
  const stats = [
    { label: 'Total', value: '42', icon: <FileText className="w-4 h-4 text-muted-foreground" /> },
    { label: 'Received', value: '39', icon: <CheckCircle2 className="w-4 h-4 text-status-active" /> },
    { label: 'Missing', value: '3', icon: <AlertCircle className="w-4 h-4 text-muted-foreground" /> },
    { label: 'Expired', value: '2', icon: <AlertCircle className="w-4 h-4 text-status-expired" /> },
    { label: 'Expiring Soon', value: '4', icon: <Clock className="w-4 h-4 text-status-review" /> },
    { label: 'Review', value: '3', icon: <Search className="w-4 h-4 text-status-review" /> },
  ];

  const rows = [
    { name: 'ABC Framing', expiry: 'Sep 18, 2026', limit: '$1M', status: 'ACTIVE', statusClass: 'bg-[var(--color-status-active-bg)] text-[var(--color-status-active)] border-[var(--color-status-active-border)]' },
    { name: 'Smith Plumbing', expiry: 'Aug 12, 2026', limit: '$1M', status: 'EXPIRED', statusClass: 'bg-[var(--color-status-expired-bg)] text-[var(--color-status-expired)] border-[var(--color-status-expired-border)]' },
    { name: 'Elite Roofing', expiry: '—', limit: '—', status: 'MISSING', statusClass: 'bg-[var(--color-status-missing-bg)] text-[var(--color-status-missing)] border-[var(--color-status-missing-border)]' },
    { name: 'Titan Concrete', expiry: 'Dec 4, 2026', limit: '$500K', status: 'REVIEW', statusClass: 'bg-[var(--color-status-review-bg)] text-[var(--color-status-review)] border-[var(--color-status-review-border)]' },
  ];

  return (
    <div className="w-full max-w-2xl bg-surface rounded-xl border border-border shadow-sm overflow-hidden flex flex-col font-sans">
      {/* Header/Stats */}
      <div className="bg-muted/30 p-5 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground mb-4">COI Status Overview</h3>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
          {stats.map((stat, idx) => (
            <div key={idx} className="flex flex-col space-y-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                {stat.icon}
                {stat.label}
              </span>
              <span className="text-lg font-bold text-foreground leading-none">{stat.value}</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Table Area */}
      <div className="p-0 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border bg-muted/10">
              <th className="py-3 px-5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Subcontractor</th>
              <th className="py-3 px-5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Expiration</th>
              <th className="py-3 px-5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Limit</th>
              <th className="py-3 px-5 text-xs font-medium text-muted-foreground uppercase tracking-wider text-right">Status</th>
              <th className="py-3 px-5 text-xs font-medium text-muted-foreground"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row, idx) => (
              <tr key={idx} className="hover:bg-muted/30 transition-colors group">
                <td className="py-3.5 px-5 text-sm font-medium text-foreground">{row.name}</td>
                <td className={`py-3.5 px-5 text-sm ${row.status === 'EXPIRED' ? 'text-status-expired font-semibold' : 'text-muted-foreground'}`}>{row.expiry}</td>
                <td className="py-3.5 px-5 text-sm text-muted-foreground">{row.limit}</td>
                <td className="py-3.5 px-5 text-right">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase border ${row.statusClass}`}>
                    {row.status}
                  </span>
                </td>
                <td className="py-3.5 px-5 text-right text-muted-foreground">
                  <button className="p-1 rounded-md hover:bg-border transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="bg-muted/10 p-3 border-t border-border flex justify-between items-center">
         <span className="text-xs text-muted-foreground">Updated just now</span>
         <span className="text-xs font-medium text-primary cursor-pointer hover:underline">View Full Report &rarr;</span>
      </div>
    </div>
  );
}
