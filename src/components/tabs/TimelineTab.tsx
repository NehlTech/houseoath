'use client';

import { Client } from '@/context/StudioContext';

interface TimelineTabProps {
  client: Client;
}

export default function TimelineTab({ client }: TimelineTabProps) {
  const getActionIcon = (actionStr: string | undefined, titleStr: string | undefined) => {
    const str = (actionStr || titleStr || '').toLowerCase();
    if (str.includes('created') || str.includes('consultation')) return 'person_add';
    if (str.includes('payment') || str.includes('deposit')) return 'payments';
    if (str.includes('measurement') || str.includes('fitting')) return 'straighten';
    if (str.includes('fabric')) return 'checkroom';
    if (str.includes('illustration') || str.includes('design')) return 'draw';
    if (str.includes('photo')) return 'photo_camera';
    return 'circle';
  };

  const sortedTimeline = [...client.timeline].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const isFirst = (i: number) => i === 0;

  return (
    <div className="animate-fade-in space-y-8">
      <div className="flex items-center gap-4">
        <div className="text-primary">
          <span className="material-symbols-outlined text-3xl">timeline</span>
        </div>
        <h2 className="text-slate-900 text-lg font-bold leading-tight tracking-tight">Activity Timeline</h2>
      </div>

      {sortedTimeline.length > 0 ? (
        <div className="flex flex-col gap-y-4 bg-white p-4 md:p-8 rounded-xl shadow-sm border border-primary/10">
          {sortedTimeline.map((event, i) => {
            const icon = getActionIcon(event.action, event.title);
            const isLast = i === sortedTimeline.length - 1;

            return (
              <div key={event.id} className="flex gap-4">
                {/* Icon + Line */}
                <div className="flex flex-col items-center gap-1 w-[48px] shrink-0">
                  <div className={`flex items-center justify-center size-10 rounded-full ${
                    isFirst(i) ? 'bg-primary text-white ring-4 ring-primary/10' : 'bg-primary/20 text-primary'
                  }`}>
                    <span className="material-symbols-outlined">{isFirst(i) ? 'check_circle' : icon}</span>
                  </div>
                  {!isLast && <div className="w-[2px] bg-primary/20 min-h-[48px] grow"></div>}
                </div>

                {/* Content */}
                <div className={`flex flex-1 flex-col ${!isLast ? 'pb-8 md:pb-10' : ''}`}>
                  <div className="flex flex-col md:flex-row justify-between items-start gap-2">
                    <div>
                      <p className={`text-slate-900 ${isFirst(i) ? 'text-lg font-bold' : 'text-lg font-medium'}`}>{event.title || event.action}</p>
                      <p className="text-slate-500 text-sm mt-1">{event.description}</p>
                    </div>
                    {isFirst(i) && (
                      <span className="text-primary text-xs font-bold bg-primary/10 px-2 py-1 rounded w-fit">LATEST</span>
                    )}
                  </div>
                  <p className={`text-sm font-normal mt-2 ${isFirst(i) ? 'text-primary font-semibold' : 'text-slate-500'}`}>
                    {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, {new Date(event.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl border-2 border-dashed border-primary/20 p-12 text-center">
          <span className="material-symbols-outlined text-slate-300 text-6xl mb-4">history</span>
          <p className="text-slate-500">No activity logged yet</p>
        </div>
      )}
    </div>
  );
}
