'use client';

import { useState } from 'react';
import { Client, useStudio } from '@/context/StudioContext';

interface MeasurementsTabProps {
  client: Client;
}

export default function MeasurementsTab({ client }: MeasurementsTabProps) {
  const { updateMeasurements } = useStudio();
  const [measurements, setMeasurements] = useState({ ...client.measurements });
  const [isEditing, setIsEditing] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  const handleChange = (key: string, value: string) => {
    setMeasurements(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    updateMeasurements(client.id, measurements);
    setIsEditing(false);
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
  };

  const sections = [
    { id: 'body', title: 'Body Measurements', group: '1 of 5', icon: 'accessibility_new',
      fields: ['bust', 'waist', 'hip', 'highHip'] },
    { id: 'upper', title: 'Upper Body', group: '2 of 5', icon: 'checkroom',
      fields: ['shoulderToNipple', 'shoulderUnderBust', 'shoulderToWaist', 'nippleToNipple', 'blouseLength', 'acrossBack'] },
    { id: 'skirt', title: 'Skirt & Lower', group: '3 of 5', icon: 'dry_cleaning',
      fields: ['skirtShortMidi', 'skirtLong'] },
    { id: 'dress', title: 'Dress Specific', group: '4 of 5', icon: 'styler',
      fields: ['dressShort', 'dressMidi', 'dressLong'] },
    { id: 'sleeve', title: 'Sleeve & Arm', group: '5 of 5', icon: 'gesture',
      fields: ['sleeve', 'sleeveLength', 'aroundArm', 'aroundElbow', 'aroundWrist'] },
  ];

  const fieldLabels: Record<string, string> = {
    bust: 'Bust', waist: 'Waist', hip: 'Hip', highHip: 'High Hip',
    shoulderToNipple: 'Shoulder to Nipple', shoulderUnderBust: 'Shoulder Under Bust',
    shoulderToWaist: 'Shoulder to Waist', nippleToNipple: 'Nipple to Nipple',
    blouseLength: 'Blouse Length', acrossBack: 'Back Width',
    skirtShortMidi: 'Short / Midi', skirtLong: 'Long',
    dressShort: 'Short', dressMidi: 'Midi', dressLong: 'Long',
    sleeve: 'Sleeve', sleeveLength: 'Sleeve Length',
    aroundArm: 'Bicep Circumference', aroundElbow: 'Around Elbow', aroundWrist: 'Around Wrist',
  };

  return (
    <div className="animate-fade-in space-y-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-primary">
            <span className="material-symbols-outlined text-3xl">straighten</span>
          </div>
          <h2 className="text-lg font-bold tracking-tight">Body Measurements</h2>
          {showSaved && <span className="text-green-600 text-sm font-medium animate-fade-in">✓ Saved</span>}
        </div>
        {isEditing ? (
          <button onClick={handleSave} className="flex items-center justify-center rounded-lg h-10 px-4 bg-primary text-white font-bold text-sm">Save Changes</button>
        ) : (
          <button onClick={() => setIsEditing(true)} className="flex items-center justify-center rounded-lg h-10 px-4 bg-slate-100 text-slate-700 font-bold text-sm hover:bg-slate-200 transition-colors">
            <span className="material-symbols-outlined text-lg mr-1">edit</span> Edit
          </button>
        )}
      </div>

      {/* Sections */}
      {sections.map(section => (
        <section key={section.id} id={section.id}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold">{section.title}</h3>
            <span className="text-xs font-medium px-2 py-1 rounded-sm bg-slate-100 text-slate-500 uppercase tracking-wider">Group {section.group}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {section.fields.map(field => (
              <div key={field} className="space-y-2">
                <label className="text-sm font-semibold flex items-center gap-1.5">
                  {fieldLabels[field]}
                  <span className="material-symbols-outlined text-slate-400 text-base cursor-help">info</span>
                </label>
                <div className="relative">
                  <input
                    className="w-full bg-white border border-none rounded-lg h-12 px-4 focus:ring-primary focus:border-primary disabled:bg-slate-50 disabled:text-slate-900"
                    placeholder="0.00"
                    type="number"
                    value={(measurements as Record<string, string>)[field] || ''}
                    onChange={(e) => handleChange(field, e.target.value)}
                    disabled={!isEditing}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">cm</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
