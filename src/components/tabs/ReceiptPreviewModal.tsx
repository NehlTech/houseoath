'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import html2canvas from 'html2canvas-pro';
import { Client, Payment, DesignIllustration } from '@/context/StudioContext';
import type { RefObject } from 'react';

interface ReceiptContentProps {
 receiptRef: RefObject<HTMLDivElement | null>;
 watermarkUrl: string;
 client: Client;
 payment: Payment;
 approvedIllustration: DesignIllustration | undefined;
 totalCost: number;
 totalPaidToDate: number;
 balanceRemaining: number;
 isPaidInFull: boolean;
 isZoomed: boolean;
 preserveWatermarkColor: boolean;
}

interface ReceiptPreviewModalProps {
 client: Client;
 payment: Payment;
 onClose: () => void;
 /** Keep the watermark in its original colors instead of forcing grayscale */
 preserveWatermarkColor?: boolean;
}

function downloadDataUrl(dataUrl: string, filename: string) {
 const link = document.createElement('a');
 link.download = filename;
 link.href = dataUrl;
 link.click();
}

export default function ReceiptPreviewModal({ client, payment, onClose, preserveWatermarkColor = false }: ReceiptPreviewModalProps) {
 const receiptRef = useRef<HTMLDivElement>(null);
 const [isZoomed, setIsZoomed] = useState(false);
 const [mounted, setMounted] = useState(false);
 const [isGenerating, setIsGenerating] = useState(false);
 const [cachedDataUrl, setCachedDataUrl] = useState<string | null>(null);
 const [cachedFile, setCachedFile] = useState<File | null>(null);
 const [isPriming, setIsPriming] = useState(true);

 useEffect(() => {
 setMounted(true);
 // Lock body scroll
 document.body.style.overflow = 'hidden';
 return () => {
 document.body.style.overflow = 'unset';
 };
 }, []);

 // Find the selected or approved illustration to use as watermark
 const approvedIllustration = 
 client.illustrations?.find(ill => ill.status === 'Approved') || 
 client.illustrations?.find(ill => ill.status === 'Current') || 
 client.illustrations?.[0];
 const watermarkUrl = approvedIllustration?.image || '';

 // Only proxy external (http/https) images to bypass CORS.
 // Local images (e.g. /samples/gown_sketch.png) don't need proxying.
 const resolvedWatermarkUrl = watermarkUrl.startsWith('http')
 ? `/api/proxy-image?url=${encodeURIComponent(watermarkUrl)}`
 : watermarkUrl;

 // Calculate payment status
 const totalCost = client.totalCost;
 const paymentDate = new Date(payment.date).getTime();
 const totalPaidToDate = client.payments
 .filter(p => new Date(p.date).getTime() <= paymentDate)
 .reduce((sum, p) => sum + p.amount, 0);
 
 const balanceRemaining = Math.max(0, totalCost - totalPaidToDate);
 const isPaidInFull = balanceRemaining === 0;
 const receiptNo = payment.receiptNumber || `HOF-${payment.id.replace('pay-', '').substring(0, 8).toUpperCase()}`;
 const receiptFilename = `HOA-Receipt-${receiptNo}.png`;

 const captureReceipt = useCallback(async () => {
 if (!receiptRef.current) return null;
 
 setIsGenerating(true);
 try {
 // Give fonts and images time to fully load. Re-read receiptRef.current
 // fresh below rather than caching it now — ReceiptContent is a stable,
 // module-level component so it shouldn't remount on state changes like
 // InvoiceDocument did, but re-reading defensively costs nothing.
 await new Promise(resolve => setTimeout(resolve, 500));

 let width = receiptRef.current?.offsetWidth ?? 0;
 let height = receiptRef.current?.scrollHeight ?? 0;
 for (let attempts = 0; (width <= 0 || height <= 0) && attempts < 10; attempts++) {
 await new Promise(resolve => setTimeout(resolve, 100));
 width = receiptRef.current?.offsetWidth ?? 0;
 height = receiptRef.current?.scrollHeight ?? 0;
 }

 const element = receiptRef.current;
 if (!element) throw new Error('Receipt element is no longer mounted — please try again.');

 if (width <= 0 || height <= 0) {
 const rect = element.getBoundingClientRect();
 width = Math.round(rect.width);
 height = Math.round(Math.max(rect.height, element.scrollHeight));
 }
 if (width <= 0 || height <= 0) {
 const parent = element.parentElement;
 const cs = window.getComputedStyle(element);
 const rect = element.getBoundingClientRect();
 const diagnostics = {
 offsetWidth: element.offsetWidth,
 offsetHeight: element.offsetHeight,
 scrollHeight: element.scrollHeight,
 rectWidth: Math.round(rect.width),
 rectHeight: Math.round(rect.height),
 display: cs.display,
 position: cs.position,
 visibility: cs.visibility,
 parentTag: parent?.tagName,
 parentDisplay: parent ? window.getComputedStyle(parent).display : null,
 visibilityState: document.visibilityState,
 };
 console.error('Receipt capture diagnostics:', diagnostics);
 throw new Error(`Receipt has no visible size yet — ${JSON.stringify(diagnostics)}`);
 }

 const canvas = await html2canvas(element, {
 scale: 2,
 backgroundColor: '#fdfcfb',
 useCORS: true,
 allowTaint: false,
 logging: false,
 width,
 height,
 });
 
 return canvas.toDataURL('image/png', 1.0);
 } catch (error) {
 console.error('Error generating receipt image:', error);
 alert(`Failed to generate receipt image: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
 return null;
 } finally {
 setIsGenerating(false);
 }
 }, []);

 // Pre-render the receipt as soon as it's visible, instead of waiting for
 // the user to click Share/Download. iOS Safari requires navigator.share()
 // to be called synchronously inside the click handler — any await before
 // it (even a fast one) loses the gesture and share() silently fails. So we
 // build the File object ahead of time too, not just the data URL, letting
 // the click handlers call share() as their very first statement.
 useEffect(() => {
 setCachedDataUrl(null);
 setCachedFile(null);
 setIsPriming(true);
 let cancelled = false;
 captureReceipt().then(async url => {
 if (cancelled || !url) { if (!cancelled) setIsPriming(false); return; }
 setCachedDataUrl(url);
 try {
 const res = await fetch(url);
 const blob = await res.blob();
 if (!cancelled) setCachedFile(new File([blob], receiptFilename, { type: 'image/png' }));
 } catch { /* ignore — click handlers fall back to the slow path */ }
 if (!cancelled) setIsPriming(false);
 });
 return () => { cancelled = true; };
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [captureReceipt]);

 const handleDownload = (e: React.MouseEvent) => {
 e.stopPropagation();

 // A website has no API to write straight into the OS photo gallery — the
 // closest thing the platform allows is handing the file to the native
 // share sheet, where "Save Image"/"Save to Photos" drops it into the
 // gallery directly instead of the browser's generic Downloads folder.
 // Calling share() synchronously here (no awaits first) is required for
 // this to work at all on iOS Safari.
 if (cachedFile && navigator.canShare && navigator.canShare({ files: [cachedFile] })) {
 navigator.share({ files: [cachedFile] }).catch(err => {
 if (err instanceof Error && err.name === 'AbortError') return; // user dismissed the sheet
 if (cachedDataUrl) downloadDataUrl(cachedDataUrl, receiptFilename);
 });
 return;
 }

 // Not pre-rendered yet (rare) — fall back to the slower async path,
 // still attempting the share sheet before resorting to a plain download.
 (async () => {
 const dataUrl = cachedDataUrl ?? await captureReceipt();
 if (!dataUrl) return;
 try {
 const res = await fetch(dataUrl);
 const blob = await res.blob();
 const file = new File([blob], receiptFilename, { type: 'image/png' });
 if (navigator.canShare && navigator.canShare({ files: [file] })) {
 await navigator.share({ files: [file] });
 return;
 }
 } catch (err) {
 if (err instanceof Error && err.name === 'AbortError') return;
 }
 downloadDataUrl(dataUrl, receiptFilename);
 })();
 };

 const handleShare = (e: React.MouseEvent) => {
 e.stopPropagation();
 const shareText = `*House of Oath - Official Receipt*
Receipt No: ${receiptNo}
Billed To: ${client.name}

Thank you for choosing House of Oath.`;

 if (cachedFile && navigator.canShare && navigator.canShare({ files: [cachedFile] })) {
 navigator.share({ files: [cachedFile], title: `Receipt ${receiptNo} - House of Oath`, text: shareText }).catch(err => {
 if (err instanceof Error && err.name === 'AbortError') return; // user dismissed the sheet
 if (cachedDataUrl) downloadDataUrl(cachedDataUrl, receiptFilename);
 });
 return;
 }

 // Not pre-rendered yet (rare) — fall back to the slower async path.
 (async () => {
 const dataUrl = cachedDataUrl ?? await captureReceipt();
 if (!dataUrl) return;
 try {
 const res = await fetch(dataUrl);
 const blob = await res.blob();
 const file = new File([blob], receiptFilename, { type: 'image/png' });

 if (navigator.canShare && navigator.canShare({ files: [file] })) {
 await navigator.share({ files: [file], title: `Receipt ${receiptNo} - House of Oath`, text: shareText });
 } else if (navigator.share) {
 await navigator.share({ title: `Receipt ${receiptNo} - House of Oath`, text: shareText });
 } else {
 navigator.clipboard.writeText(shareText);
 alert('Receipt summary copied to clipboard! The image has also been downloaded automatically.');
 downloadDataUrl(dataUrl, receiptFilename);
 }
 } catch (error) {
 if (error instanceof Error && error.name === 'AbortError') return; // user dismissed the sheet, don't also download
 console.error('Error sharing', error);
 downloadDataUrl(dataUrl, receiptFilename);
 }
 })();
 };

 const modalContent = (
 <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#000000] bg-opacity-95 p-0 sm:p-8 overflow-y-auto print:p-0 print:bg-transparent print:absolute print:inset-0">
 
 {/* Loading Overlay */}
 {(isGenerating || isPriming) && (
 <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white">
 <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4"></div>
 <p className="text-sm font-bold tracking-[0.2em] animate-pulse px-6 text-center">Preparing High-Quality Receipt...</p>
 </div>
 )}

 {/* Zoomed / Full-Screen Mode for Mobile */}
 {isZoomed ? (
 <div className="fixed inset-0 z-[110] bg-white flex flex-col items-center overflow-y-auto animate-fade-in no-scrollbar">
 {/* Zoom Controls Overlay */}
 <div className="sticky top-0 left-0 right-0 z-[120] flex items-center justify-between p-4 bg-[#1a0f08] text-white shadow-xl sm:hidden">
 <button 
 onClick={() => setIsZoomed(false)} 
 className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all"
 >
 <span className="material-symbols-outlined text-[20px]">close_fullscreen</span>
 <span className="text-[10px] font-bold tracking-wider">Close</span>
 </button>
 <div className="flex gap-2">
 <button 
 onClick={handleShare}
 disabled={isGenerating || isPriming}
 className="flex items-center justify-center size-9 rounded-full bg-white/10 border border-white/20 text-white active:scale-95 transition-all disabled:opacity-50"
 >
 <span className="material-symbols-outlined text-[18px]">share</span>
 </button>
 <button 
 onClick={handleDownload}
 disabled={isGenerating || isPriming}
 className="flex items-center justify-center size-9 rounded-full bg-white text-[#1a0f08] active:scale-95 transition-all disabled:opacity-50"
 >
 <span className="material-symbols-outlined text-[18px]">download</span>
 </button>
 </div>
 </div>

 <div 
 onClick={() => setIsZoomed(false)}
 className="w-full max-w-[800px] bg-white min-h-screen relative flex flex-col shadow-2xl"
 >
 <ReceiptContent 
 receiptRef={receiptRef} 
 watermarkUrl={resolvedWatermarkUrl} 
 client={client} 
 payment={payment} 
 approvedIllustration={approvedIllustration} 
 totalCost={totalCost} 
 totalPaidToDate={totalPaidToDate} 
 balanceRemaining={balanceRemaining} 
 isPaidInFull={isPaidInFull}
 isZoomed={true}
 preserveWatermarkColor={preserveWatermarkColor}
 />
 </div>
 </div>
 ) : (
 <div className="flex flex-col items-center w-full max-w-4xl max-h-full print:max-h-none print:w-[210mm] print:h-[297mm]">
 
 {/* Modal Controls */}
 <div className="flex flex-col sm:flex-row sm:justify-between items-center w-full max-w-[800px] mb-4 sm:mb-6 gap-3 sm:gap-4 print:hidden px-4">
 <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
 <h2 className="text-white text-[11px] sm:text-2xl font-light tracking-[0.3em] " style={{ fontFamily: '"Inter", sans-serif' }}>Receipt Preview</h2>
 <p className="text-white/40 text-[9px] tracking-normal mt-1 sm:hidden italic">Tap the receipt to fill screen</p>
 </div>
 <div className="flex items-center gap-2 sm:gap-3">
 <button 
 onClick={onClose}
 className="flex items-center justify-center size-9 sm:w-auto sm:h-auto sm:px-5 sm:py-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-white/90 transition-all backdrop-blur-md group cursor-pointer"
 title="Close Preview"
 >
 <span className="material-symbols-outlined text-[18px] sm:hidden group-hover:scale-110 transition-transform">close</span>
 <span className="hidden sm:inline font-medium tracking-wider text-xs ">Cancel</span>
 </button>
 
 <button 
 onClick={handleShare}
 disabled={isGenerating || isPriming}
 className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 text-white transition-all backdrop-blur-md shadow-lg shadow-black/20 group cursor-pointer disabled:opacity-50"
 title="Share Receipt Image"
 >
 <span className="material-symbols-outlined text-[16px] sm:text-[18px] group-hover:-translate-y-0.5 transition-transform">share</span>
 <span className="font-semibold tracking-wider text-[10px] sm:text-xs ">Share</span>
 </button>

 <button 
 onClick={handleDownload}
 disabled={isGenerating || isPriming}
 className="flex items-center justify-center gap-2 px-4 sm:px-7 py-2 sm:py-2.5 rounded-full bg-white hover:bg-gray-100 text-[#1a0f08] transition-all shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-[0_0_25px_rgba(255,255,255,0.25)] group cursor-pointer disabled:opacity-50"
 title="Download Receipt Image"
 >
 <span className="material-symbols-outlined text-[16px] sm:text-[18px] group-hover:scale-110 transition-transform">download</span>
 <span className="font-bold tracking-wider text-[10px] sm:text-xs ">Save</span>
 </button>
 </div>
 </div>

 {/* The Actual Receipt Document */}
 <div 
 id="receipt-print-area" 
 onClick={() => setIsZoomed(true)}
 className="w-full max-w-[800px] overflow-hidden rounded-xl shadow-2xl relative bg-white shrink-0 print:shadow-none print:w-full print:h-full print:rounded-none transition-all duration-300 cursor-pointer sm:cursor-default min-h-[400px] sm:min-h-[calc(800px*1.414)]"
 >
 <ReceiptContent 
 receiptRef={receiptRef} 
 watermarkUrl={resolvedWatermarkUrl} 
 client={client} 
 payment={payment} 
 approvedIllustration={approvedIllustration} 
 totalCost={totalCost} 
 totalPaidToDate={totalPaidToDate} 
 balanceRemaining={balanceRemaining} 
 isPaidInFull={isPaidInFull}
 isZoomed={false}
 preserveWatermarkColor={preserveWatermarkColor}
 />
 </div>
 </div>
 )}
 </div>
 );

 if (!mounted) return null;
 return createPortal(modalContent, document.body);
}

// ─── Sub-component for Receipt Content ───────────────────────────
function ReceiptContent({
 receiptRef, watermarkUrl, client, payment, approvedIllustration: _approvedIllustration,
 totalCost, totalPaidToDate, balanceRemaining, isPaidInFull, isZoomed, preserveWatermarkColor
}: ReceiptContentProps) {
 return (
 <div 
 ref={receiptRef}
 className={`w-full h-full min-h-full flex-grow relative flex flex-col ${isZoomed ? 'p-8 sm:p-16' : 'p-8 sm:p-12 md:p-16'}`}
 style={{ 
 background: '#fdfcfb',
 WebkitPrintColorAdjust: 'exact',
 printColorAdjust: 'exact'
 }}
 >
 {/* Watermark Image Layer */}
 {watermarkUrl && (
 <img
 src={watermarkUrl}
 className={`absolute inset-0 z-0 pointer-events-none w-full h-full object-cover opacity-[0.14] mix-blend-multiply ${preserveWatermarkColor ? '' : 'grayscale'}`}
 alt=""
 style={preserveWatermarkColor ? undefined : { filter: 'grayscale(100%) contrast(120%) brightness(1.05)' }}
 />
 )}
 
 {/* Content Layer */}
 <div className="relative z-10 w-full h-auto min-h-full flex flex-col sm:justify-between text-[#1a0f08]">
 
 {/* --- HEADER --- */}
 <div className="w-full flex flex-col items-center border-b-[1px] border-[#1a0f0815] pb-8 pt-6 relative">
 
 {/* Elegant Minimalist Logo */}
 <div className="flex flex-col items-center z-10">
 <div className="flex items-center gap-6">
 <div className="w-16 h-[1px] bg-[#1a0f0830]"></div>
 
 <div className="w-[100px] sm:w-[120px] flex items-center justify-center shrink-0">
 <img 
 src="/ho_logo.png" 
 alt="House of Oath Logo" 
 className="w-full h-auto object-contain"
 />
 </div>

 <div className="w-16 h-[1px] bg-[#1a0f0830]"></div>
 </div>
 <h1 className="mt-6 text-[11px] sm:text-[13px] tracking-[0.4em] font-medium text-[#1a0f08]" style={{ fontFamily: '"Inter", sans-serif' }}>
 House of Oath
 </h1>
 <p className="mt-2 text-[8px] sm:text-[9px] tracking-[0.2em] text-[#1a0f08]/60" style={{ fontFamily: '"Inter", sans-serif' }}>
 Tailoring Studio
 </p>
 </div>
 </div>

 {/* --- RECEIPT META DATA --- */}
 <div className="w-full flex flex-col sm:flex-row justify-between pt-10 pb-12 gap-8 sm:gap-0 border-b-[1px] border-[#1a0f0815]">
 <div className="flex flex-col gap-2">
 <p className="text-[9px] tracking-[0.2em] text-[#1a0f08]/50 font-semibold font-sans">Billed To</p>
 <p className="text-[13px] sm:text-[15px] tracking-normal font-medium" style={{ fontFamily: '"Inter", sans-serif' }}>
 {client.name}
 </p>
 <p className="text-[11px] sm:text-[12px] tracking-wider text-[#1a0f08]/70 font-display italic mt-1">
 {client.phone || 'Client Contact on File'}
 </p>
 </div>
 <div className="flex flex-col sm:items-end gap-2 text-left sm:text-right">
 <p className="text-[9px] tracking-[0.2em] text-[#1a0f08]/50 font-semibold font-sans">Official Receipt</p>
 <p className="text-[13px] sm:text-[15px] tracking-normal font-medium" style={{ fontFamily: '"Inter", sans-serif' }}>
 {payment.receiptNumber || `HOF-${payment.id.replace('pay-', '').substring(0, 8).toUpperCase()}`}
 </p>
 <p className="text-[11px] sm:text-[12px] tracking-wider text-[#1a0f08]/70 font-display italic mt-1">
 Date Issued: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
 </p>
 </div>
 </div>

 {/* --- INVOICE TABLE --- */}
 <div className="w-full flex-1">
 {/* Table Header */}
 <div className="grid grid-cols-12 gap-4 border-b-[1px] border-[#1a0f08] pb-3 text-[9px] sm:text-[10px] tracking-[0.2em] font-semibold text-[#1a0f08]/60 font-sans">
 <div className="col-span-12 sm:col-span-8">Description of Services</div>
 <div className="hidden sm:block sm:col-span-2 text-center">Qty</div>
 <div className="hidden sm:block sm:col-span-2 text-right">Amount (GHS)</div>
 </div>

 {/* Table Body Row */}
 <div className="grid grid-cols-12 gap-4 py-6 text-[12px] sm:text-[14px] font-display leading-relaxed" style={{ color: '#1a0f08' }}>
 <div className="col-span-12 sm:col-span-8 pr-0 sm:pr-8">
 <p className="font-sans font-medium tracking-wider text-[11px] sm:text-[13px] mb-2">
 {client.eventName ? client.eventName : 'Tailoring Services'}
 </p>
 {client.notes && (
 <p className="text-[#1a0f08]/80 text-justify italic opacity-90 leading-loose">
 {client.notes}
 </p>
 )}
 {client.fabricVendor && (
 <p className="mt-4 text-[11px] font-sans tracking-normal text-[#1a0f08]/60 ">
 Material: {client.fabricVendor}
 </p>
 )}
 </div>
 
 {/* Mobile-only Qty/Amount layout */}
 <div className="col-span-12 flex justify-between sm:hidden border-t border-[#1a0f0810] pt-4 mt-4 font-sans tracking-normal">
 <span className="text-[10px] text-[#1a0f08]/50 ">Quantity: 1</span>
 <span className="font-medium">GHS {client.totalCost.toLocaleString()}</span>
 </div>

 {/* Desktop-only Qty/Amount layout */}
 <div className="hidden sm:block sm:col-span-2 text-center pt-1 font-sans tracking-normal">
 1
 </div>
 <div className="hidden sm:block sm:col-span-2 text-right pt-1 font-sans tracking-normal font-medium">
 {client.totalCost.toLocaleString()}
 </div>
 </div>
 </div>

 {/* --- TOTALS & STAMP --- */}
 <div className="w-full border-t-[1px] border-[#1a0f0815] pt-8 flex justify-end relative mt-12 sm:mt-0">
 
 {/* PAID IN FULL Stamp (Subtle & Elegant) */}
 {isPaidInFull && (
 <div className="absolute left-0 top-12 pointer-events-none opacity-[0.08] -rotate-6 border-[3px] border-[#1a0f08] p-4 z-0">
 <span className="text-3xl font-bold tracking-[0.4em] text-[#1a0f08] font-sans">
 PAID IN FULL
 </span>
 </div>
 )}

 <div className="w-full sm:w-[320px] flex flex-col gap-4 font-sans tracking-normal text-[11px] sm:text-[12px] relative z-10 text-[#1a0f08]">
 <div className="flex justify-between items-center text-[#1a0f08]/70">
 <span className="uppercase text-[9px] font-semibold">Total Payments</span>
 <span>GHS {totalCost.toLocaleString()}</span>
 </div>
 <div className="flex justify-between items-center text-[#1a0f08]/70">
 <span className="uppercase text-[9px] font-semibold">Previous Payments</span>
 <span>GHS {totalPaidToDate.toLocaleString()}</span>
 </div>
 <div className="flex flex-col bg-[#1a0f08]/5 -mx-4 py-3 sm:-mx-6 px-4 sm:px-6 mt-2 border-y border-[#1a0f0815]">
 <div className="flex justify-between items-center">
 <span className="uppercase text-[10px] font-bold">Payment This Receipt</span>
 <span className="font-bold">GHS {payment.amount.toLocaleString()}</span>
 </div>
 <div className="flex justify-between items-center mt-1">
 <span className="uppercase text-[8px] font-medium text-[#1a0f08]/60">Payment Date & Time</span>
 <span className="text-[9px] text-[#1a0f08]/70 italic">{new Date(payment.date).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
 </div>
 </div>
 <div className="flex justify-between items-center mt-2 pb-2">
 <span className="uppercase text-[10px] font-bold">Outstanding Balance</span>
 <span className={`font-bold ${balanceRemaining === 0 ? 'text-[#1a0f08]/40' : 'text-[#1a0f08]'}`}>
 {balanceRemaining === 0 ? 'CLEARED' : `GHS ${balanceRemaining.toLocaleString()}`}
 </span>
 </div>
 </div>
 </div>

 {/* --- FOOTER: PAYMENT DETAILS --- */}
 <div className="w-full mt-16 pt-8 border-t-[1px] border-[#1a0f08] flex flex-col sm:flex-row justify-between gap-6 sm:gap-0 font-sans tracking-[0.15em] text-[8px] sm:text-[9px] text-[#1a0f08]/60">
 <div className="flex flex-col gap-1.5">
 <p className="font-bold text-[#1a0f08]">Bank Transfer Details</p>
 <p>Account No. 2400261494911</p>
 <p>Fidelity Bank Ghana</p>
 <p>Account Name: House of Oath</p>
 </div>

 <div className="flex flex-col gap-1.5">
 <p className="font-bold text-[#1a0f08]">Mobile Money</p>
 <p>0545124346</p>
 <p>House of Oath</p>
 </div>

 <div className="flex flex-col sm:items-end gap-1.5 text-left sm:text-right max-w-xs">
 <p className="font-bold text-[#1a0f08]">Payment Terms</p>
 <p>Bank or Mobile Money payments only.</p>
 <p>Other options subject to</p>
 <p>international/state requirements.</p>
 </div>
 </div>

 <div className="w-full text-center mt-12 text-[7px] tracking-[0.3em] font-sans text-[#1a0f08]/30">
 Thank you for choosing House of Oath.
 </div>

 </div>
 </div>
 );
}
