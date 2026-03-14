'use client';

import { useState } from 'react';
import { Client, Fitting, useStudio } from '@/context/StudioContext';

interface FittingsTabProps {
  client: Client;
}

export default function FittingsTab({ client }: FittingsTabProps) {
  const { updateFittings } = useStudio();
  const [fittings, setFittings] = useState<Fitting>({ ...client.fittings });
  const [isEditing, setIsEditing] = useState(false);

  const handleChange = (key: keyof Fitting, value: string) => {
    setFittings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    updateFittings(client.id, fittings);
    setIsEditing(false);
  };

  const stages = [
    { key: 'startDate' as keyof Fitting, label: 'Start Date', icon: 'flag' },
    { key: 'firstFitting' as keyof Fitting, label: 'First Fitting (Basted)', icon: 'checkroom' },
    { key: 'secondFitting' as keyof Fitting, label: 'Second Fitting', icon: 'event' },
    { key: 'finalFitting' as keyof Fitting, label: 'Final Fitting', icon: 'check_circle' },
    { key: 'deliveryDate' as keyof Fitting, label: 'Delivery Date', icon: 'local_shipping' },
  ];

  const isComplete = (date: string) => date && new Date(date) <= new Date();
  const isNext = (date: string, i: number) => {
    if (!date) return false;
    const past = stages.slice(0, i).every(s => isComplete(fittings[s.key]));
    return past && !isComplete(date);
  };

  return (
    <div className="animate-fade-in space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="material-symbols-outlined text-primary text-3xl">straighten</span>
          <h2 className="text-xl font-bold leading-tight tracking-tight">Fittings Schedule</h2>
        </div>
        {isEditing ? (
          <button onClick={handleSave} className="h-10 px-4 rounded-lg bg-primary text-white font-bold text-sm">Save Schedule</button>
        ) : (
          <button onClick={() => setIsEditing(true)} className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
            <span className="material-symbols-outlined text-[20px]">edit</span>
          </button>
        )}
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-primary/5">
        <h3 className="text-lg font-bold mb-6 md:mb-8 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">timeline</span>
          Production Progress
        </h3>
        <div className="space-y-0">
          {stages.map((stage, i) => {
            const dateValue = fittings[stage.key];
            const completed = isComplete(dateValue);
            const next = isNext(dateValue, i);
            const isLast = i === stages.length - 1;

            return (
              <div key={stage.key} className="grid grid-cols-[40px_1fr] gap-x-4">
                <div className="flex flex-col items-center">
                  {completed ? (
                    <div className="size-8 rounded-full bg-primary flex items-center justify-center text-white ring-4 ring-primary/20">
                      <span className="material-symbols-outlined text-sm">check</span>
                    </div>
                  ) : next ? (
                    <div className="size-10 rounded-full border-2 border-primary bg-primary/10 flex items-center justify-center text-primary ring-4 ring-primary/5 z-10">
                      <span className="material-symbols-outlined text-xl">{stage.icon}</span>
                    </div>
                  ) : (
                    <div className="size-8 rounded-full border-2 border-slate-300 flex items-center justify-center text-slate-400">
                      <span className="material-symbols-outlined text-sm">{stage.icon}</span>
                    </div>
                  )}
                  {!isLast && (
                    <div className={`w-0.5 h-12 ${completed ? 'bg-primary' : 'bg-slate-200'}`}></div>
                  )}
                </div>
                <div className="pb-8">
                  <div className="flex items-center gap-3">
                    <p className={`font-semibold text-base leading-none ${completed ? 'text-slate-900' : next ? 'text-slate-900 font-bold text-lg' : 'text-slate-400'}`}>
                      {stage.label}
                    </p>
                    {next && <span className="bg-primary/20 text-primary text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter">Next Up</span>}
                  </div>
                  {isEditing ? (
                    <input type="date" value={dateValue} onChange={(e) => handleChange(stage.key, e.target.value)}
                      className="mt-2 w-full max-w-xs bg-white border border-none rounded-lg h-10 px-3 text-sm focus:ring-primary focus:border-primary" />
                  ) : (
                    <p className={`text-sm mt-1 ${completed ? 'text-primary/70' : next ? 'text-primary font-semibold' : 'text-slate-400'}`}>
                      {dateValue ? `${completed ? 'Completed' : next ? 'Scheduled' : 'Expected'} — ${new Date(dateValue).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}` : 'Not scheduled'}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
