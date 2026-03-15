'use client';

import { useRef, useState } from 'react';
import { Client, Payment } from '@/context/StudioContext';

interface ReceiptPreviewModalProps {
  client: Client;
  payment: Payment;
  onClose: () => void;
}

export default function ReceiptPreviewModal({ client, payment, onClose }: ReceiptPreviewModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);

  // Find the selected or approved illustration to use as watermark (Priority: Approved -> Current -> First)
  const approvedIllustration = 
    client.illustrations?.find(ill => ill.status === 'Approved') || 
    client.illustrations?.find(ill => ill.status === 'Current') || 
    client.illustrations?.[0];
  const watermarkUrl = approvedIllustration?.image || '';

  // Calculate payment status
  const totalCost = client.totalCost;
  // Sum payments made up to and including the date of this specific payment
  const paymentDate = new Date(payment.date).getTime();
  const totalPaidToDate = client.payments
    .filter(p => new Date(p.date).getTime() <= paymentDate)
    .reduce((sum, p) => sum + p.amount, 0);
  
  const balanceRemaining = Math.max(0, totalCost - totalPaidToDate);
  const isPaidInFull = balanceRemaining === 0;

  const generatePDF = () => {
    window.print();
  };

  const handleShare = async () => {
    const receiptNo = payment.receiptNumber || `HOF-${payment.id.replace('pay-', '').substring(0, 8).toUpperCase()}`;
    const shareText = `*House of Oath - Official Receipt*
Receipt No: ${receiptNo}
Billed To: ${client.name}

Total Commission: GHS ${totalCost.toLocaleString()}
Payment This Receipt: GHS ${payment.amount.toLocaleString()}
Outstanding Balance: ${balanceRemaining === 0 ? 'CLEARED' : `GHS ${balanceRemaining.toLocaleString()}`}

Thank you for choosing House of Oath.`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Receipt ${receiptNo} - House of Oath`,
          text: shareText,
        });
      } catch (error) {
        console.error('Error sharing', error);
      }
    } else {
      navigator.clipboard.writeText(shareText);
      alert('Receipt summary copied to clipboard! You can now paste it into WhatsApp.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#000000] bg-opacity-90 p-2 sm:p-8 overflow-y-auto print:p-0 print:bg-transparent print:absolute print:inset-0">
      <div className={`flex flex-col items-center w-full max-w-4xl transition-all duration-300 ${isZoomed ? 'scale-100 max-h-none h-fit my-8' : 'max-h-full'} print:max-h-none print:w-[210mm] print:h-[297mm]`}>
        
        {/* Modal Controls */}
        <div className="flex flex-col sm:flex-row sm:justify-between items-center w-full max-w-[800px] mb-4 sm:mb-6 gap-3 sm:gap-4 print:hidden">
          <div className="flex flex-col items-center sm:items-start">
            <h2 className="text-white text-[10px] sm:text-2xl font-light tracking-[0.3em] uppercase" style={{ fontFamily: '"Inter", sans-serif' }}>Receipt Preview</h2>
            <p className="text-white/40 text-[9px] uppercase tracking-widest mt-1 sm:hidden">Tap the receipt to {isZoomed ? 'shrink' : 'zoom in'}</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button 
              onClick={onClose}
              className="flex items-center justify-center size-9 sm:w-auto sm:h-auto sm:px-5 sm:py-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-white/90 transition-all backdrop-blur-md group cursor-pointer"
              title="Close Preview"
            >
              <span className="material-symbols-outlined text-[18px] sm:hidden group-hover:scale-110 transition-transform">close</span>
              <span className="hidden sm:inline font-medium tracking-wider text-xs uppercase">Cancel</span>
            </button>
            
            <button 
              onClick={handleShare}
              className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 text-white transition-all backdrop-blur-md shadow-lg shadow-black/20 group cursor-pointer"
              title="Share Receipt"
            >
              <span className="material-symbols-outlined text-[16px] sm:text-[18px] group-hover:-translate-y-0.5 transition-transform">share</span>
              <span className="font-semibold tracking-wider text-[10px] sm:text-xs uppercase">Share</span>
            </button>

            <button 
              onClick={generatePDF}
              className="flex items-center justify-center gap-2 px-4 sm:px-7 py-2 sm:py-2.5 rounded-full bg-white hover:bg-gray-100 text-[#1a0f08] transition-all shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-[0_0_25px_rgba(255,255,255,0.25)] group cursor-pointer"
              title="Download or Print PDF"
            >
              <span className="material-symbols-outlined text-[16px] sm:text-[18px] group-hover:scale-110 transition-transform">download</span>
              <span className="font-bold tracking-wider text-[10px] sm:text-xs uppercase">PDF</span>
            </button>
          </div>
        </div>

        {/* The Actual Receipt Document */}
        <div 
          id="receipt-print-area" 
          onClick={() => setIsZoomed(!isZoomed)}
          className={`transition-all duration-300 cursor-pointer sm:cursor-default bg-white print:shadow-none print:w-full print:h-full print:rounded-none
            ${isZoomed 
              ? 'fixed inset-0 z-[60] overflow-y-auto rounded-none shadow-none flex flex-col items-center' 
              : 'w-full max-w-[800px] overflow-hidden rounded-xl shadow-2xl relative shrink-0 min-h-[400px] sm:min-h-[calc(800px*1.414)]'
            }`}
        >
          {isZoomed && (
            <button 
              className="fixed top-6 right-6 z-[70] bg-[#1a0f08] text-white rounded-full size-12 shadow-2xl flex items-center justify-center sm:hidden animate-fade-in"
              onClick={(e) => { e.stopPropagation(); setIsZoomed(false); }}
            >
              <span className="material-symbols-outlined text-[24px]">close_fullscreen</span>
            </button>
          )}
          
          <div 
            ref={receiptRef}
            className={`w-full min-h-full relative flex flex-col ${isZoomed ? 'max-w-[800px] shadow-2xl my-0 sm:my-8' : ''}`}
            style={{ 
              background: '#fdfcfb', // Ultra-faint warm paper tint
              WebkitPrintColorAdjust: 'exact',
              printColorAdjust: 'exact'
            }}
          >
            {/* Watermark Image Layer (Extremely subtle) */}
            {watermarkUrl && (
              <div 
                className="absolute inset-0 z-0 pointer-events-none" 
                style={{
                  backgroundImage: `url('${watermarkUrl}')`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  opacity: 0.04, // Very faint
                  filter: 'grayscale(100%) contrast(120%)' // Elegant look
                }}
              />
            )}
            
            {/* Content Layer */}
            <div className="relative z-10 w-full h-auto min-h-full p-8 sm:p-12 md:p-16 flex flex-col sm:justify-between text-[#1a0f08]">
              
              {/* --- HEADER --- */}
              <div className="w-full flex flex-col items-center border-b-[1px] border-[#1a0f0815] pb-8 pt-6 relative">
                
                {/* Elegant Minimalist Logo */}
                <div className="flex flex-col items-center z-10">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-[1px] bg-[#1a0f0830]"></div>
                    <div className="text-6xl sm:text-8xl italic font-light tracking-tighter" style={{ fontFamily: '"Playfair Display", Georgia, serif', color: '#1a0f08' }}>
                      <span className="mr-1">h</span>
                      <span className="-ml-4 sm:-ml-6">o</span>
                    </div>
                    <div className="w-16 h-[1px] bg-[#1a0f0830]"></div>
                  </div>
                  <h1 className="mt-6 text-[11px] sm:text-[13px] uppercase tracking-[0.4em] font-medium text-[#1a0f08]" style={{ fontFamily: '"Inter", sans-serif' }}>
                    House of Oath
                  </h1>
                  <p className="mt-2 text-[8px] sm:text-[9px] uppercase tracking-[0.2em] text-[#1a0f08]/60" style={{ fontFamily: '"Inter", sans-serif' }}>
                    Bespoke Tailoring Studio
                  </p>
                </div>
              </div>

              {/* --- RECEIPT META DATA --- */}
              <div className="w-full flex flex-col sm:flex-row justify-between pt-10 pb-12 gap-8 sm:gap-0 border-b-[1px] border-[#1a0f0815]">
                <div className="flex flex-col gap-2">
                  <p className="text-[9px] uppercase tracking-[0.2em] text-[#1a0f08]/50 font-semibold font-sans">Billed To</p>
                  <p className="text-[13px] sm:text-[15px] uppercase tracking-widest font-medium" style={{ fontFamily: '"Inter", sans-serif' }}>
                    {client.name}
                  </p>
                  <p className="text-[11px] sm:text-[12px] tracking-wider text-[#1a0f08]/70 font-display italic mt-1">
                    {client.phone || 'Client Contact on File'}
                  </p>
                </div>
                <div className="flex flex-col sm:items-end gap-2 text-left sm:text-right">
                  <p className="text-[9px] uppercase tracking-[0.2em] text-[#1a0f08]/50 font-semibold font-sans">Official Receipt</p>
                  <p className="text-[13px] sm:text-[15px] uppercase tracking-widest font-medium" style={{ fontFamily: '"Inter", sans-serif' }}>
                    {payment.receiptNumber || `HOF-${payment.id.replace('pay-', '').substring(0, 8).toUpperCase()}`}
                  </p>
                  <p className="text-[11px] sm:text-[12px] tracking-wider text-[#1a0f08]/70 font-display italic mt-1">
                    Date: {new Date(payment.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              </div>

              {/* --- INVOICE TABLE --- */}
              <div className="w-full flex-1">
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 border-b-[1px] border-[#1a0f08] pb-3 text-[9px] sm:text-[10px] uppercase tracking-[0.2em] font-semibold text-[#1a0f08]/60 font-sans">
                  <div className="col-span-12 sm:col-span-8">Description of Services</div>
                  <div className="hidden sm:block sm:col-span-2 text-center">Qty</div>
                  <div className="hidden sm:block sm:col-span-2 text-right">Amount (GHS)</div>
                </div>

                {/* Table Body Row */}
                <div className="grid grid-cols-12 gap-4 py-6 text-[12px] sm:text-[14px] font-display leading-relaxed" style={{ color: '#1a0f08' }}>
                  <div className="col-span-12 sm:col-span-8 pr-0 sm:pr-8">
                    <p className="font-sans font-medium uppercase tracking-wider text-[11px] sm:text-[13px] mb-2">
                      {client.eventName ? `Bespoke ${client.eventName} Attire` : 'Bespoke Private Commission'}
                    </p>
                    <p className="text-[#1a0f08]/80 text-justify italic opacity-90 leading-loose">
                      {approvedIllustration?.notes || client.notes || 'Full custom garment construction tailored to exact specifications. Includes pattern drafting, fabric cutting, detailed stitching, fittings, and final hand-finishing.'}
                    </p>
                    {client.fabricVendor && (
                      <p className="mt-4 text-[11px] font-sans tracking-widest text-[#1a0f08]/60 uppercase">
                        Material: {client.fabricVendor}
                      </p>
                    )}
                  </div>
                  
                  {/* Mobile-only Qty/Amount layout */}
                  <div className="col-span-12 flex justify-between sm:hidden border-t border-[#1a0f0810] pt-4 mt-4 font-sans tracking-widest">
                    <span className="text-[10px] text-[#1a0f08]/50 uppercase">Quantity: 1</span>
                    <span className="font-medium">GHS {client.totalCost.toLocaleString()}</span>
                  </div>

                  {/* Desktop-only Qty/Amount layout */}
                  <div className="hidden sm:block sm:col-span-2 text-center pt-1 font-sans tracking-widest">
                    1
                  </div>
                  <div className="hidden sm:block sm:col-span-2 text-right pt-1 font-sans tracking-widest font-medium">
                    {client.totalCost.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* --- TOTALS & STAMP --- */}
              <div className="w-full border-t-[1px] border-[#1a0f0815] pt-8 flex justify-end relative mt-12 sm:mt-0">
                
                {/* PAID IN FULL Stamp (Subtle & Elegant) */}
                {isPaidInFull && (
                  <div className="absolute left-0 top-12 pointer-events-none opacity-[0.08] -rotate-6 border-[3px] border-[#1a0f08] p-4 z-0">
                    <span className="text-3xl font-bold uppercase tracking-[0.4em] text-[#1a0f08] font-sans">
                      PAID IN FULL
                    </span>
                  </div>
                )}

                <div className="w-full sm:w-[320px] flex flex-col gap-4 font-sans tracking-widest text-[11px] sm:text-[12px] relative z-10 text-[#1a0f08]">
                  <div className="flex justify-between items-center text-[#1a0f08]/70">
                    <span className="uppercase text-[9px] font-semibold">Total Commission</span>
                    <span>GHS {totalCost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-[#1a0f08]/70">
                    <span className="uppercase text-[9px] font-semibold">Previous Payments</span>
                    <span>GHS {totalPaidToDate.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center bg-[#1a0f08]/5 -mx-4 px-4 py-3 sm:-mx-6 sm:px-6 mt-2 border-y border-[#1a0f0815]">
                    <span className="uppercase text-[10px] font-bold">Payment This Receipt</span>
                    <span className="font-bold">GHS {payment.amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center mt-2 pb-2">
                    <span className="uppercase text-[10px] font-bold">Outstanding Balance</span>
                    <span className={`font-bold ${balanceRemaining === 0 ? 'text-[#1a0f08]/40' : 'text-[#1a0f08]'}`}>
                      {balanceRemaining === 0 ? 'CLEARED' : `GHS ${balanceRemaining.toLocaleString()}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* --- FOOTER: BANK DETAILS --- */}
              <div className="w-full mt-16 pt-8 border-t-[1px] border-[#1a0f08] flex flex-col sm:flex-row justify-between gap-6 sm:gap-0 font-sans tracking-[0.15em] text-[8px] sm:text-[9px] uppercase text-[#1a0f08]/60">
                <div className="flex flex-col gap-1.5">
                  <p className="font-bold text-[#1a0f08]">Bank Transfer Details</p>
                  <p>Account No. 2400261494911</p>
                  <p>Fidelity Bank Ghana</p>
                  <p>Account Name: House of Oath</p>
                </div>
                
                <div className="flex flex-col sm:items-end gap-1.5 text-left sm:text-right max-w-xs">
                  <p className="font-bold text-[#1a0f08]">Payment Terms</p>
                  <p>Bank payments only.</p>
                  <p>Other options available subject to</p>
                  <p>international/state requirements.</p>
                </div>
              </div>

              <div className="w-full text-center mt-12 text-[7px] tracking-[0.3em] font-sans uppercase text-[#1a0f08]/30">
                Thank you for choosing House of Oath.
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
