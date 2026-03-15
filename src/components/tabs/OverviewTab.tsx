'use client';

import { useState } from 'react';
import { Client, useStudio } from '@/context/StudioContext';

interface OverviewTabProps {
  client: Client;
}

function EditableField({ label, value, fieldKey, clientId }: { label: string; value: string; fieldKey: string; clientId: string }) {
  const { updateClient } = useStudio();
  const [editing, setEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);

  const handleSave = () => {
    setEditing(false);
    if (localValue !== value) {
      updateClient(clientId, { [fieldKey]: localValue } as Partial<Client>);
    }
  };

  if (editing) {
    return (
      <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 ring-1 ring-primary/50 transition-all">
        <span className="text-gray text-sm flex-shrink-0 mr-3">{label}</span>
        <input
          autoFocus
          className="text-sm font-medium text-charcoal text-right bg-transparent border-none outline-none flex-1 min-w-0"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') { setLocalValue(value); setEditing(false); } }}
        />
      </div>
    );
  }

  return (
    <div
      onClick={() => { setLocalValue(value); setEditing(true); }}
      className="flex items-center justify-between p-3 rounded-lg bg-canvas shadow-sm border-none cursor-pointer hover:bg-primary/5 hover:ring-1 hover:ring-primary/20 transition-all group"
    >
      <span className="text-gray text-sm flex-shrink-0 mr-2">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-charcoal text-right">{value || '—'}</span>
        <span className="material-symbols-outlined text-primary/40 text-[16px] opacity-0 group-hover:opacity-100 transition-opacity">edit</span>
      </div>
    </div>
  );
}

function EditableNumberField({ label, value, fieldKey, clientId, prefix }: { label: string; value: number; fieldKey: string; clientId: string; prefix?: string }) {
  const { updateClient } = useStudio();
  const [editing, setEditing] = useState(false);
  const [localValue, setLocalValue] = useState(String(value));

  const handleSave = () => {
    setEditing(false);
    const num = parseFloat(localValue) || 0;
    if (num !== value) {
      updateClient(clientId, { [fieldKey]: num } as Partial<Client>);
    }
  };

  if (editing) {
    return (
      <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 ring-1 ring-primary/50 transition-all">
        <span className="text-gray text-sm flex-shrink-0 mr-3">{label}</span>
        <div className="flex items-center gap-1">
          {prefix && <span className="text-sm font-medium text-charcoal">{prefix}</span>}
          <input
            autoFocus
            type="number"
            className="text-sm font-medium text-charcoal text-right bg-transparent border-none outline-none w-24"
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') { setLocalValue(String(value)); setEditing(false); } }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => { setLocalValue(String(value)); setEditing(true); }}
      className="flex items-center justify-between p-3 rounded-lg bg-canvas shadow-sm border-none cursor-pointer hover:bg-primary/5 hover:ring-1 hover:ring-primary/20 transition-all group"
    >
      <span className="text-gray text-sm">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-charcoal">{prefix}{value.toLocaleString()}</span>
        <span className="material-symbols-outlined text-primary/40 text-[16px] opacity-0 group-hover:opacity-100 transition-opacity">edit</span>
      </div>
    </div>
  );
}

function WorkerSelectField({ label, value, clientId }: { label: string; value: string; clientId: string }) {
  const { updateClient, workers } = useStudio();
  const [editing, setEditing] = useState(false);

  const handleSave = (workerName: string) => {
    setEditing(false);
    updateClient(clientId, { assignedWorker: workerName });
  };

  if (editing) {
    return (
      <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 ring-1 ring-primary/50 transition-all">
        <span className="text-gray text-sm flex-shrink-0 mr-3">{label}</span>
        <select
          autoFocus
          className="text-sm font-medium text-charcoal text-right bg-transparent border-none outline-none flex-1 min-w-0 appearance-none"
          value={value}
          onChange={(e) => handleSave(e.target.value)}
          onBlur={() => setEditing(false)}
        >
          <option value="">Unassigned</option>
          {workers.map(w => (
            <option key={w.id} value={w.name}>{w.name}</option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div
      onClick={() => setEditing(true)}
      className="flex items-center justify-between p-3 rounded-lg bg-canvas shadow-sm border-none cursor-pointer hover:bg-primary/5 hover:ring-1 hover:ring-primary/20 transition-all group"
    >
      <span className="text-gray text-sm flex-shrink-0 mr-2">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-charcoal text-right">{value || 'Unassigned'}</span>
        <span className="material-symbols-outlined text-primary/40 text-[16px] opacity-0 group-hover:opacity-100 transition-opacity">edit</span>
      </div>
    </div>
  );
}

function EditableTextArea({ label, value, fieldKey, clientId }: { label: string; value: string; fieldKey: string; clientId: string }) {
  const { updateClient } = useStudio();
  const [editing, setEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);

  const handleSave = () => {
    setEditing(false);
    if (localValue !== value) {
      updateClient(clientId, { [fieldKey]: localValue } as Partial<Client>);
    }
  };

  if (editing) {
    return (
      <div className="bg-card p-4 md:p-6 rounded-xl border border-primary/30 shadow-sm">
        <h3 className="text-charcoal text-lg font-display font-bold mb-3 tracking-wide">{label}</h3>
        <textarea
          autoFocus
          className="w-full text-gray text-sm leading-relaxed bg-transparent border-none outline-none resize-none"
          rows={4}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleSave}
        />
      </div>
    );
  }

  return (
    <div
      onClick={() => { setLocalValue(value); setEditing(true); }}
      className="bg-card p-4 md:p-6 rounded-xl shadow-sm border-none shadow-sm cursor-pointer hover:border-primary/30 hover:shadow-md transition-all group"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-charcoal text-lg font-display font-bold tracking-wide">{label}</h3>
        <span className="material-symbols-outlined text-primary/40 text-[18px] opacity-0 group-hover:opacity-100 transition-opacity">edit</span>
      </div>
      <p className="text-gray text-sm leading-relaxed">{value || 'Click to add notes...'}</p>
    </div>
  );
}

export default function OverviewTab({ client }: OverviewTabProps) {
  const amountPaid = client.payments.reduce((sum, p) => sum + p.amount, 0);
  const balance = client.totalCost - amountPaid;
  const daysToEvent = client.eventDate ? Math.max(0, Math.ceil((new Date(client.eventDate).getTime() - Date.now()) / 86400000)) : 0;
  const fittingsDone = [client.fittings.startDate, client.fittings.firstFitting, client.fittings.secondFitting, client.fittings.finalFitting]
    .filter(d => d && new Date(d) <= new Date()).length;

  return (
    <div className="animate-fade-in space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="flex flex-col gap-2 rounded-xl p-6 bg-card shadow-sm border-none shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-primary/10 rounded-lg">
              <span className="material-symbols-outlined text-primary">schedule</span>
            </div>
            <p className="text-gray text-[11px] font-bold uppercase tracking-wider">Days to Event</p>
          </div>
          <p className="text-charcoal text-3xl font-display font-bold">{daysToEvent}</p>
        </div>
        <div className="flex flex-col gap-2 rounded-xl p-6 bg-card shadow-sm border-none shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-primary/10 rounded-lg">
              <span className="material-symbols-outlined text-primary">payments</span>
            </div>
            <p className="text-gray text-[11px] font-bold uppercase tracking-wider">Total Payments</p>
          </div>
          <p className="text-charcoal text-3xl font-display font-bold">GHS {amountPaid.toLocaleString()}</p>
        </div>
        <div className="flex flex-col gap-2 rounded-xl p-6 bg-card shadow-sm border-none shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-primary/10 rounded-lg">
              <span className="material-symbols-outlined text-primary">check_circle</span>
            </div>
            <p className="text-gray text-[11px] font-bold uppercase tracking-wider">Fittings Done</p>
          </div>
          <p className="text-charcoal text-3xl font-display font-bold">{fittingsDone} / 4</p>
        </div>
      </div>

      {/* Project Summary & Client Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
        <div className="bg-card p-4 md:p-6 rounded-xl shadow-sm border-none shadow-sm">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <h3 className="text-charcoal text-lg font-display font-bold tracking-wide">Project Summary</h3>
            <span className="text-[11px] text-primary/60 font-medium uppercase tracking-wider">Edit</span>
          </div>
          <div className="space-y-3">
            <EditableField label="Event Name" value={client.eventName} fieldKey="eventName" clientId={client.id} />
            <EditableField label="Event Date" value={client.eventDate} fieldKey="eventDate" clientId={client.id} />
             <EditableField label="Event Location" value={client.eventLocation} fieldKey="eventLocation" clientId={client.id} />
            <WorkerSelectField label="Assigned To" value={client.assignedWorker || ''} clientId={client.id} />
            <EditableNumberField label="Total Cost" value={client.totalCost} fieldKey="totalCost" clientId={client.id} prefix="GHS " />
            <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/10 mt-4">
              <span className="text-charcoal text-sm font-medium">Balance</span>
              <span className={`text-sm font-bold tracking-wide ${balance > 0 ? 'text-primary' : 'text-success'}`}>GHS {balance.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="bg-card p-4 md:p-6 rounded-xl shadow-sm border-none shadow-sm">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <h3 className="text-charcoal text-lg font-display font-bold tracking-wide">Client Details</h3>
            <span className="text-[11px] text-primary/60 font-medium uppercase tracking-wider">Edit</span>
          </div>
          <div className="space-y-3">
            <EditableField label="Gender" value={client.gender} fieldKey="gender" clientId={client.id} />
            <EditableField label="Phone" value={client.phone} fieldKey="phone" clientId={client.id} />
            <EditableField label="Email" value={client.email} fieldKey="email" clientId={client.id} />
            <EditableField label="Address" value={client.address} fieldKey="address" clientId={client.id} />
            <EditableField label="Vendor" value={client.kenteVendor} fieldKey="kenteVendor" clientId={client.id} />
            <EditableField label="Referral" value={client.referralSource} fieldKey="referralSource" clientId={client.id} />
          </div>
        </div>
      </div>

      {/* Notes */}
      <EditableTextArea label="Notes" value={client.notes} fieldKey="notes" clientId={client.id} />
    </div>
  );
}
