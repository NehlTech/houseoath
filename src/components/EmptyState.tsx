'use client';

export default function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-transparent p-8">
      <div className="flex flex-col items-center text-center max-w-sm">
        <div className="relative mb-8">
          <div className="flex h-48 w-48 items-center justify-center rounded-full bg-primary/5 shadow-sm border-none">
            <div className="relative flex items-center justify-center">
              <span className="material-symbols-outlined text-primary/10 text-[120px]">content_cut</span>
              <span className="material-symbols-outlined absolute text-primary text-[60px] opacity-80" style={{ transform: 'translate(20px, 20px)' }}>apparel</span>
            </div>
          </div>
          <div className="absolute -top-4 -right-4 h-8 w-8 rounded-full bg-primary/10 border border-primary/20"></div>
          <div className="absolute -bottom-2 -left-6 h-12 w-12 rounded-full bg-primary/5 border border-primary/10"></div>
        </div>
        <h3 className="text-3xl font-display font-bold text-charcoal mb-3 tracking-wide">House of Oath Fashion</h3>
        <p className="text-gray mb-8 leading-relaxed font-medium">
          Manage your elite client fittings, bespoke measurements, and couture project timelines. Select a client to view their dossier.
        </p>
        <div className="flex gap-4">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 shadow-sm border-none">
            <span className="material-symbols-outlined text-primary text-[16px]">check_circle</span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-charcoal">Active Projects</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 shadow-sm border-none">
            <span className="material-symbols-outlined text-primary text-[16px]">schedule</span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-charcoal">Fittings Today</span>
          </div>
        </div>
      </div>
    </div>
  );
}
