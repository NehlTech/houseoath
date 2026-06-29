'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import html2canvas from 'html2canvas-pro';
import { Client } from '@/context/StudioContext';

interface InvoicePreviewModalProps {
 client: Client;
 onClose: () => void;
 /** Walk-in invoices are settled immediately and don't carry payment terms — default true for real clients */
 requireDueDate?: boolean;
 /** Keep the watermark in its original colors instead of forcing grayscale */
 preserveWatermarkColor?: boolean;
}

interface InvoiceLineItem {
 id: string;
 description: string;
 qty: string;
 rate: string;
}

interface InvoiceFormData {
 invoiceNo: string;
 invoiceDate: string;
 dueDate: string;
 terms: string;
 items: InvoiceLineItem[];
 salesTaxEnabled: boolean;
 salesTax: string;
 shippingEnabled: boolean;
 shipping: string;
 notes: string;
}

function generateInvoiceNo(clientId: string): string {
 return `HOA-INV-${clientId.substring(0, 6).toUpperCase().padEnd(6, '0')}-${Date.now().toString().slice(-4)}`;
}

function formatDate(iso: string): string {
 return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function newItem(): InvoiceLineItem {
 return { id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, description: '', qty: '1', rate: '' };
}

export default function InvoicePreviewModal({ client, onClose, requireDueDate = true, preserveWatermarkColor = false }: InvoicePreviewModalProps) {
 const invoiceRef = useRef<HTMLDivElement>(null);
 const [mounted, setMounted] = useState(false);
 const [step, setStep] = useState<'form' | 'preview'>('form');
 const [isZoomed, setIsZoomed] = useState(false);
 const [isGenerating, setIsGenerating] = useState(false);

 const todayIso = new Date().toISOString().split('T')[0];

 const [form, setForm] = useState<InvoiceFormData>({
 invoiceNo: generateInvoiceNo(client.id),
 invoiceDate: todayIso,
 dueDate: '',
 terms: 'Payment before delivery',
 items: [newItem()],
 salesTaxEnabled: false,
 salesTax: '',
 shippingEnabled: false,
 shipping: '',
 notes: '',
 });

 useEffect(() => {
 setMounted(true);
 document.body.style.overflow = 'hidden';
 return () => { document.body.style.overflow = 'unset'; };
 }, []);

 // ── Derived totals ──────────────────────────────────────────────────────────
 const subtotal = form.items.reduce((sum, item) => {
 const qty = parseFloat(item.qty) || 0;
 const rate = parseFloat(item.rate) || 0;
 return sum + qty * rate;
 }, 0);
 const salesTaxAmt = form.salesTaxEnabled ? (parseFloat(form.salesTax) || 0) : 0;
 const shippingAmt = form.shippingEnabled ? (parseFloat(form.shipping) || 0) : 0;
 const total = subtotal + salesTaxAmt + shippingAmt;

 const canPreview = form.items.length > 0 && (!requireDueDate || form.dueDate.trim() !== '') &&
 form.items.some(item => item.description.trim() !== '' && parseFloat(item.rate) > 0);

 // ── Item helpers ────────────────────────────────────────────────────────────
 const updateItem = (id: string, field: keyof InvoiceLineItem, value: string) => {
 setForm(prev => ({
 ...prev,
 items: prev.items.map(item => item.id === id ? { ...item, [field]: value } : item),
 }));
 };

 const removeItem = (id: string) => {
 setForm(prev => ({ ...prev, items: prev.items.filter(item => item.id !== id) }));
 };

 const addItem = () => {
 setForm(prev => ({ ...prev, items: [...prev.items, newItem()] }));
 };

 // ── Watermark ───────────────────────────────────────────────────────────────
 const approvedIllustration =
 client.illustrations?.find(ill => ill.status === 'Approved') ||
 client.illustrations?.find(ill => ill.status === 'Current') ||
 client.illustrations?.[0];
 const watermarkUrl = approvedIllustration?.image || '';
 const resolvedWatermarkUrl = watermarkUrl.startsWith('http')
 ? `/api/proxy-image?url=${encodeURIComponent(watermarkUrl)}`
 : watermarkUrl;

 // ── html2canvas capture ──────────────────────────────────────────────────────
 const captureInvoice = useCallback(async () => {
 if (!invoiceRef.current) return null;
 setIsGenerating(true);
 try {
 // setIsGenerating(true) above triggers a re-render. InvoiceDocument is
 // redefined on every render of this component, so React treats it as a
 // new component type and fully remounts its DOM node — meaning a ref
 // captured into a local variable BEFORE this remount settles is left
 // pointing at an orphaned, detached element forever (offsetWidth/
 // getBoundingClientRect permanently 0, no amount of waiting fixes it).
 // Re-read invoiceRef.current fresh each time instead of caching it.
 await new Promise(resolve => setTimeout(resolve, 500));

 let width = invoiceRef.current?.offsetWidth ?? 0;
 let height = invoiceRef.current?.scrollHeight ?? 0;
 for (let attempts = 0; (width <= 0 || height <= 0) && attempts < 10; attempts++) {
 await new Promise(resolve => setTimeout(resolve, 100));
 width = invoiceRef.current?.offsetWidth ?? 0;
 height = invoiceRef.current?.scrollHeight ?? 0;
 }

 const element = invoiceRef.current;
 if (!element) throw new Error('Invoice element is no longer mounted — please try again.');

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
 console.error('Invoice capture diagnostics:', diagnostics);
 throw new Error(`Invoice has no visible size yet — ${JSON.stringify(diagnostics)}`);
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
 } catch (err) {
 console.error('Invoice capture failed:', err);
 alert(`Failed to generate invoice image: ${err instanceof Error ? err.message : 'Unknown error'}. Please try again.`);
 return null;
 } finally {
 setIsGenerating(false);
 }
 }, []);

 const handleDownload = async (e: React.MouseEvent) => {
 e.stopPropagation();
 const dataUrl = await captureInvoice();
 if (dataUrl) {
 const link = document.createElement('a');
 link.download = `HOA-Invoice-${form.invoiceNo}.png`;
 link.href = dataUrl;
 link.click();
 }
 };

 const handleShare = async (e: React.MouseEvent) => {
 e.stopPropagation();
 const dataUrl = await captureInvoice();
 if (!dataUrl) return;
 const shareText = `*House of Oath - Invoice*\nInvoice No: ${form.invoiceNo}\nBilled To: ${client.name}\nTotal: GHS ${total.toLocaleString()}\n\nThank you for choosing House of Oath.`;
 try {
 const res = await fetch(dataUrl);
 const blob = await res.blob();
 const file = new File([blob], `HOA-Invoice-${form.invoiceNo}.png`, { type: 'image/png' });
 if (navigator.canShare && navigator.canShare({ files: [file] })) {
 await navigator.share({ files: [file], title: `Invoice ${form.invoiceNo} - House of Oath`, text: shareText });
 } else if (navigator.share) {
 await navigator.share({ title: `Invoice ${form.invoiceNo} - House of Oath`, text: shareText });
 } else {
 navigator.clipboard.writeText(shareText);
 const link = document.createElement('a');
 link.download = `HOA-Invoice-${form.invoiceNo}.png`;
 link.href = dataUrl;
 link.click();
 }
 } catch {
 const link = document.createElement('a');
 link.download = `HOA-Invoice-${form.invoiceNo}.png`;
 link.href = dataUrl;
 link.click();
 }
 };

 // ── Invoice document (shared between normal + zoomed) ──────────────────────
 const InvoiceDocument = ({ isZoomed: zoomed }: { isZoomed: boolean }) => (
 <div
 ref={invoiceRef}
 className={`w-full h-full min-h-full flex-grow relative flex flex-col ${zoomed ? 'p-8 sm:p-16' : 'p-8 sm:p-12 md:p-16'}`}
 style={{ background: '#fdfcfb', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
 >
 {resolvedWatermarkUrl && (
 <img
 src={resolvedWatermarkUrl}
 className={`absolute inset-0 z-0 pointer-events-none w-full h-full object-cover opacity-[0.1] mix-blend-multiply ${preserveWatermarkColor ? '' : 'grayscale'}`}
 alt=""
 style={preserveWatermarkColor ? undefined : { filter: 'grayscale(100%) contrast(120%) brightness(1.05)' }}
 />
 )}

 <div className="relative z-10 w-full h-auto min-h-full flex flex-col text-[#1a0f08]">
 {/* Header */}
 <div className="w-full flex flex-col items-center border-b-[1px] border-[#1a0f0815] pb-8 pt-6">
 <div className="flex flex-col items-center z-10">
 <div className="flex items-center gap-6">
 <div className="w-16 h-[1px] bg-[#1a0f0830]"></div>
 <div className="w-[100px] sm:w-[120px] flex items-center justify-center shrink-0">
 <img src="/ho_logo.png" alt="House of Oath Logo" className="w-full h-auto object-contain" />
 </div>
 <div className="w-16 h-[1px] bg-[#1a0f0830]"></div>
 </div>
 <h1 className="mt-6 text-[11px] sm:text-[13px] tracking-[0.4em] font-medium" style={{ fontFamily: '"Inter", sans-serif' }}>
 House of Oath
 </h1>
 <p className="mt-2 text-[8px] sm:text-[9px] tracking-[0.2em] text-[#1a0f08]/60" style={{ fontFamily: '"Inter", sans-serif' }}>
 Tailoring Studio
 </p>
 </div>
 </div>

 {/* Invoice Meta */}
 <div className="w-full flex flex-col sm:flex-row justify-between pt-10 pb-12 gap-8 sm:gap-0 border-b-[1px] border-[#1a0f0815]">
 <div className="flex flex-col gap-2">
 <p className="text-[9px] tracking-[0.2em] text-[#1a0f08]/50 font-semibold font-sans">Billed To</p>
 <p className="text-[13px] sm:text-[15px] tracking-normal font-medium" style={{ fontFamily: '"Inter", sans-serif' }}>
 {client.name}
 </p>
 <p className="text-[11px] sm:text-[12px] tracking-wider text-[#1a0f08]/70 font-display italic mt-1">
 {client.phone || 'Client Contact on File'}
 </p>
 {client.email && (
 <p className="text-[10px] text-[#1a0f08]/60 tracking-wider">{client.email}</p>
 )}
 </div>
 <div className="flex flex-col sm:items-end gap-2 text-left sm:text-right">
 <p className="text-[9px] tracking-[0.2em] text-[#1a0f08]/50 font-semibold font-sans">Invoice</p>
 <p className="text-[13px] sm:text-[15px] tracking-normal font-medium" style={{ fontFamily: '"Inter", sans-serif' }}>
 {form.invoiceNo}
 </p>
 <p className="text-[11px] sm:text-[12px] tracking-wider text-[#1a0f08]/70 font-display italic mt-1">
 Date Issued: {formatDate(form.invoiceDate)}
 </p>
 <p className="text-[10px] text-[#1a0f08]/60 tracking-wider">
 Due: {form.dueDate ? formatDate(form.dueDate) : '—'}
 </p>
 {form.terms && (
 <p className="text-[9px] text-[#1a0f08]/50 tracking-wider italic mt-1">{form.terms}</p>
 )}
 </div>
 </div>

 {/* Service Table */}
 <div className="w-full flex-1">
 <div className="grid grid-cols-12 gap-4 border-b-[1px] border-[#1a0f08] pb-3 text-[9px] sm:text-[10px] tracking-[0.2em] font-semibold text-[#1a0f08]/60 font-sans">
 <div className="col-span-12 sm:col-span-6">Description of Services</div>
 <div className="hidden sm:block sm:col-span-2 text-center">Qty</div>
 <div className="hidden sm:block sm:col-span-2 text-right">Rate (GHS)</div>
 <div className="hidden sm:block sm:col-span-2 text-right">Amount (GHS)</div>
 </div>

 {form.items.map((item, idx) => {
 const itemAmt = (parseFloat(item.qty) || 0) * (parseFloat(item.rate) || 0);
 return (
 <div
 key={item.id}
 className={`grid grid-cols-12 gap-4 py-5 text-[12px] sm:text-[13px] font-sans leading-relaxed ${idx < form.items.length - 1 ? 'border-b border-[#1a0f0810]' : ''}`}
 style={{ color: '#1a0f08' }}
 >
 <div className="col-span-12 sm:col-span-6 pr-0 sm:pr-6">
 <p className="font-medium tracking-wide">{item.description || <span className="opacity-30 italic">No description</span>}</p>
 </div>
 {/* Mobile: qty + amount on one line */}
 <div className="col-span-12 flex justify-between sm:hidden border-t border-[#1a0f0810] pt-3 mt-1 font-sans tracking-normal text-[11px]">
 <span className="text-[#1a0f08]/50 ">Qty: {item.qty || '1'}</span>
 <span className="font-medium">GHS {itemAmt.toLocaleString()}</span>
 </div>
 <div className="hidden sm:block sm:col-span-2 text-center pt-0.5 font-sans tracking-normal">{item.qty || '1'}</div>
 <div className="hidden sm:block sm:col-span-2 text-right pt-0.5 font-sans tracking-normal">{item.rate ? (parseFloat(item.rate) || 0).toLocaleString() : '—'}</div>
 <div className="hidden sm:block sm:col-span-2 text-right pt-0.5 font-sans tracking-normal font-medium">{itemAmt.toLocaleString()}</div>
 </div>
 );
 })}
 </div>

 {/* Totals */}
 <div className="w-full border-t-[1px] border-[#1a0f0815] pt-8 flex justify-end mt-12 sm:mt-0">
 <div className="w-full sm:w-[320px] flex flex-col gap-4 font-sans tracking-normal text-[11px] sm:text-[12px] relative z-10 text-[#1a0f08]">
 <div className="flex justify-between items-center text-[#1a0f08]/70">
 <span className="uppercase text-[9px] font-semibold">Subtotal</span>
 <span>GHS {subtotal.toLocaleString()}</span>
 </div>
 {form.salesTaxEnabled && salesTaxAmt > 0 && (
 <div className="flex justify-between items-center text-[#1a0f08]/70">
 <span className="uppercase text-[9px] font-semibold">Sales Tax</span>
 <span>GHS {salesTaxAmt.toLocaleString()}</span>
 </div>
 )}
 {form.shippingEnabled && shippingAmt > 0 && (
 <div className="flex justify-between items-center text-[#1a0f08]/70">
 <span className="uppercase text-[9px] font-semibold">Shipping / Delivery</span>
 <span>GHS {shippingAmt.toLocaleString()}</span>
 </div>
 )}
 <div className="flex flex-col bg-[#1a0f08]/5 -mx-4 py-3 sm:-mx-6 px-4 sm:px-6 mt-2 border-y border-[#1a0f0815]">
 <div className="flex justify-between items-center">
 <span className="uppercase text-[10px] font-bold">Total</span>
 <span className="font-bold text-[14px] sm:text-[15px]">GHS {total.toLocaleString()}</span>
 </div>
 </div>
 </div>
 </div>

 {/* Notes */}
 {form.notes && (
 <div className="w-full mt-10 pt-6 border-t-[1px] border-[#1a0f0815]">
 <p className="text-[9px] tracking-[0.2em] text-[#1a0f08]/50 font-semibold font-sans mb-2">Notes</p>
 <p className="text-[11px] text-[#1a0f08]/70 italic leading-relaxed font-display">{form.notes}</p>
 </div>
 )}

 {/* Footer Payment Details */}
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
 <p>{form.terms || 'Payment due before delivery.'}</p>
 <p>Bank or Mobile Money payments accepted.</p>
 </div>
 </div>

 <div className="w-full text-center mt-12 text-[7px] tracking-[0.3em] font-sans text-[#1a0f08]/30">
 Thank you for choosing House of Oath.
 </div>
 </div>
 </div>
 );

 // ── FORM STEP ───────────────────────────────────────────────────────────────
 const formContent = (
 <div className="fixed inset-0 z-[100] bg-black/80 flex items-start sm:items-center justify-center p-0 sm:p-6">
 <div className="bg-canvas w-full max-w-2xl h-dvh sm:h-auto sm:max-h-[90vh] sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in">
 {/* Form header */}
 <div className="sticky top-0 z-10 bg-white border-b border-border/60 px-5 py-4 flex items-center justify-between shrink-0">
 <div>
 <h2 className="text-lg font-extrabold tracking-tight text-charcoal">New Invoice</h2>
 <p className="text-xs text-slate-400 mt-0.5">{client.name}</p>
 </div>
 <button
 onClick={onClose}
 className="size-9 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-all"
 >
 <span className="material-symbols-outlined text-[20px]">close</span>
 </button>
 </div>

 <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
 {/* Billed To (read-only) */}
 <div className="bg-white rounded-xl border border-border/60 p-4 space-y-2">
 <p className="text-xs font-bold tracking-wider text-slate-400">Billed To</p>
 <p className="font-bold text-charcoal">{client.name}</p>
 {client.phone && <p className="text-sm text-slate-500">{client.phone}</p>}
 {client.email && <p className="text-sm text-slate-500">{client.email}</p>}
 </div>

 {/* Invoice meta */}
 <div className="bg-white rounded-xl border border-border/60 p-4 space-y-4">
 <p className="text-xs font-bold tracking-wider text-slate-400">Invoice Details</p>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div>
 <label className="text-xs font-bold tracking-wider text-slate-700 block mb-1.5">Invoice Number</label>
 <input
 type="text"
 readOnly
 value={form.invoiceNo}
 className="w-full bg-slate-50 border border-border/60 rounded-lg h-10 px-3 text-sm font-mono text-slate-400 cursor-default"
 />
 </div>
 <div>
 <label className="text-xs font-bold tracking-wider text-slate-700 block mb-1.5">Invoice Date</label>
 <input
 type="text"
 readOnly
 value={formatDate(form.invoiceDate)}
 className="w-full bg-slate-50 border border-border/60 rounded-lg h-10 px-3 text-sm text-slate-400 cursor-default"
 />
 </div>
 <div>
 <label className="text-xs font-bold tracking-wider text-slate-700 block mb-1.5">
 Due Date {requireDueDate && <span className="text-primary">*</span>}
 </label>
 <input
 type="date"
 value={form.dueDate}
 onChange={e => setForm(prev => ({ ...prev, dueDate: e.target.value }))}
 placeholder={requireDueDate ? undefined : 'Optional'}
 className="w-full bg-white border border-border/60 rounded-lg h-10 px-3 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
 />
 </div>
 <div>
 <label className="text-xs font-bold tracking-wider text-slate-700 block mb-1.5">Terms</label>
 <input
 type="text"
 value={form.terms}
 onChange={e => setForm(prev => ({ ...prev, terms: e.target.value }))}
 placeholder="Payment before delivery"
 className="w-full bg-white border border-border/60 rounded-lg h-10 px-3 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
 />
 </div>
 </div>
 </div>

 {/* Line Items */}
 <div className="bg-white rounded-xl border border-border/60 p-4 space-y-3">
 <p className="text-xs font-bold tracking-wider text-slate-400">Line Items</p>

 {/* Table header (desktop) */}
 <div className="hidden sm:grid grid-cols-12 gap-2 text-[10px] font-bold tracking-wider text-slate-400 pb-1 border-b border-border/40">
 <div className="col-span-5">Description</div>
 <div className="col-span-2 text-center">Qty</div>
 <div className="col-span-2 text-right">Rate (GHS)</div>
 <div className="col-span-2 text-right">Amount</div>
 <div className="col-span-1"></div>
 </div>

 <div className="space-y-2">
 {form.items.map(item => {
 const amt = (parseFloat(item.qty) || 0) * (parseFloat(item.rate) || 0);
 return (
 <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
 <div className="col-span-12 sm:col-span-5">
 <input
 type="text"
 value={item.description}
 onChange={e => updateItem(item.id, 'description', e.target.value)}
 placeholder="Description"
 className="w-full bg-slate-50 border border-border/60 rounded-lg h-9 px-3 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
 />
 </div>
 <div className="col-span-3 sm:col-span-2">
 <input
 type="number"
 value={item.qty}
 min="0"
 onChange={e => updateItem(item.id, 'qty', e.target.value)}
 placeholder="1"
 className="w-full bg-slate-50 border border-border/60 rounded-lg h-9 px-3 text-sm text-charcoal text-center focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
 />
 </div>
 <div className="col-span-4 sm:col-span-2">
 <input
 type="number"
 value={item.rate}
 min="0"
 onChange={e => updateItem(item.id, 'rate', e.target.value)}
 placeholder="0.00"
 className="w-full bg-slate-50 border border-border/60 rounded-lg h-9 px-3 text-sm text-charcoal text-right focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
 />
 </div>
 <div className="col-span-4 sm:col-span-2 text-right">
 <div className="h-9 flex items-center justify-end px-3 bg-slate-50 border border-border/60 rounded-lg text-sm font-semibold text-charcoal">
 {amt > 0 ? amt.toLocaleString() : '—'}
 </div>
 </div>
 <div className="col-span-1 flex justify-center">
 <button
 onClick={() => removeItem(item.id)}
 disabled={form.items.length === 1}
 className="size-9 flex items-center justify-center rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
 >
 <span className="material-symbols-outlined text-[18px]">close</span>
 </button>
 </div>
 </div>
 );
 })}
 </div>

 <button
 onClick={addItem}
 className="mt-1 flex items-center gap-1.5 text-primary text-sm font-bold hover:underline transition-all"
 >
 <span className="material-symbols-outlined text-[18px]">add_circle</span>
 Add Product / Service
 </button>
 </div>

 {/* Optional extras */}
 <div className="bg-white rounded-xl border border-border/60 p-4 space-y-4">
 <p className="text-xs font-bold tracking-wider text-slate-400">Optional Charges</p>

 {/* Sales Tax */}
 <div className="flex flex-col gap-2">
 <div className="flex items-center justify-between">
 <label className="text-sm font-semibold text-charcoal">Sales Tax</label>
 <button
 role="switch"
 aria-checked={form.salesTaxEnabled}
 onClick={() => setForm(prev => ({ ...prev, salesTaxEnabled: !prev.salesTaxEnabled }))}
 className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none ${form.salesTaxEnabled ? 'bg-primary' : 'bg-slate-200'}`}
 >
 <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.salesTaxEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
 </button>
 </div>
 {form.salesTaxEnabled && (
 <div className="flex items-center gap-2">
 <span className="text-sm text-slate-500 font-medium shrink-0">GHS</span>
 <input
 type="number"
 value={form.salesTax}
 min="0"
 onChange={e => setForm(prev => ({ ...prev, salesTax: e.target.value }))}
 placeholder="0.00"
 className="flex-1 bg-slate-50 border border-border/60 rounded-lg h-10 px-3 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
 />
 </div>
 )}
 </div>

 {/* Shipping */}
 <div className="flex flex-col gap-2">
 <div className="flex items-center justify-between">
 <label className="text-sm font-semibold text-charcoal">Shipping / Delivery</label>
 <button
 role="switch"
 aria-checked={form.shippingEnabled}
 onClick={() => setForm(prev => ({ ...prev, shippingEnabled: !prev.shippingEnabled }))}
 className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none ${form.shippingEnabled ? 'bg-primary' : 'bg-slate-200'}`}
 >
 <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.shippingEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
 </button>
 </div>
 {form.shippingEnabled && (
 <div className="flex items-center gap-2">
 <span className="text-sm text-slate-500 font-medium shrink-0">GHS</span>
 <input
 type="number"
 value={form.shipping}
 min="0"
 onChange={e => setForm(prev => ({ ...prev, shipping: e.target.value }))}
 placeholder="0.00"
 className="flex-1 bg-slate-50 border border-border/60 rounded-lg h-10 px-3 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
 />
 </div>
 )}
 </div>
 </div>

 {/* Summary card */}
 <div className="bg-white rounded-xl border border-border/60 p-4 space-y-3">
 <p className="text-xs font-bold tracking-wider text-slate-400">Summary</p>
 <div className="space-y-2 text-sm font-sans">
 <div className="flex justify-between text-slate-500">
 <span>Subtotal</span>
 <span>GHS {subtotal.toLocaleString()}</span>
 </div>
 {form.salesTaxEnabled && (
 <div className="flex justify-between text-slate-500">
 <span>Sales Tax</span>
 <span>GHS {salesTaxAmt.toLocaleString()}</span>
 </div>
 )}
 {form.shippingEnabled && (
 <div className="flex justify-between text-slate-500">
 <span>Shipping / Delivery</span>
 <span>GHS {shippingAmt.toLocaleString()}</span>
 </div>
 )}
 <div className="flex justify-between items-center pt-2 border-t border-border/60 font-extrabold text-charcoal text-base">
 <span>Total</span>
 <span>GHS {total.toLocaleString()}</span>
 </div>
 </div>
 </div>

 {/* Notes */}
 <div className="bg-white rounded-xl border border-border/60 p-4 space-y-2">
 <label className="text-xs font-bold tracking-wider text-slate-400 block">Notes (optional)</label>
 <textarea
 value={form.notes}
 onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
 rows={3}
 placeholder="Any additional notes for the client..."
 className="w-full bg-slate-50 border border-border/60 rounded-lg px-3 py-2 text-sm text-charcoal resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
 />
 </div>
 </div>

 {/* Form footer */}
 <div className="sticky bottom-0 bg-white border-t border-border/60 px-5 py-4 flex items-center justify-between shrink-0">
 <button
 onClick={onClose}
 className="px-5 py-2 rounded-lg text-slate-500 text-sm font-semibold hover:bg-slate-100 transition-all"
 >
 Cancel
 </button>
 <button
 onClick={() => setStep('preview')}
 disabled={!canPreview}
 className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-white font-bold text-sm shadow-lg shadow-primary/20 hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
 >
 Preview Invoice
 <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
 </button>
 </div>
 </div>
 </div>
 );

 // ── PREVIEW STEP ────────────────────────────────────────────────────────────
 const previewContent = (
 <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-95 p-0 sm:p-8 overflow-y-auto">
 {isGenerating && (
 <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white">
 <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4"></div>
 <p className="text-sm font-bold tracking-[0.2em] animate-pulse px-6 text-center">Preparing Invoice...</p>
 </div>
 )}

 {isZoomed ? (
 <div className="fixed inset-0 z-[110] bg-white flex flex-col items-center overflow-y-auto animate-fade-in no-scrollbar">
 <div className="sticky top-0 left-0 right-0 z-[120] flex items-center justify-between p-4 bg-[#1a0f08] text-white shadow-xl sm:hidden">
 <button onClick={() => setIsZoomed(false)} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all">
 <span className="material-symbols-outlined text-[20px]">close_fullscreen</span>
 <span className="text-[10px] font-bold tracking-wider">Close</span>
 </button>
 <div className="flex gap-2">
 <button onClick={handleShare} disabled={isGenerating} className="flex items-center justify-center size-9 rounded-full bg-white/10 border border-white/20 text-white active:scale-95 transition-all disabled:opacity-50">
 <span className="material-symbols-outlined text-[18px]">share</span>
 </button>
 <button onClick={handleDownload} disabled={isGenerating} className="flex items-center justify-center size-9 rounded-full bg-white text-[#1a0f08] active:scale-95 transition-all disabled:opacity-50">
 <span className="material-symbols-outlined text-[18px]">download</span>
 </button>
 </div>
 </div>
 <div onClick={() => setIsZoomed(false)} className="w-full max-w-[800px] bg-white min-h-screen relative flex flex-col shadow-2xl">
 <InvoiceDocument isZoomed={true} />
 </div>
 </div>
 ) : (
 <div className="flex flex-col items-center w-full max-w-4xl max-h-full">
 <div className="flex flex-col sm:flex-row sm:justify-between items-center w-full max-w-[800px] mb-4 sm:mb-6 gap-3 sm:gap-4 px-4">
 <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
 <h2 className="text-white text-[11px] sm:text-2xl font-light tracking-[0.3em] " style={{ fontFamily: '"Inter", sans-serif' }}>Invoice Preview</h2>
 <p className="text-white/40 text-[9px] tracking-normal mt-1 sm:hidden italic">Tap the invoice to fill screen</p>
 </div>
 <div className="flex items-center gap-2 sm:gap-3">
 <button
 onClick={() => { setStep('form'); setIsZoomed(false); }}
 className="flex items-center justify-center gap-1.5 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-white/90 transition-all backdrop-blur-md cursor-pointer"
 >
 <span className="material-symbols-outlined text-[16px]">arrow_back</span>
 <span className="font-medium tracking-wider text-[10px] sm:text-xs ">Edit</span>
 </button>
 <button onClick={onClose} className="flex items-center justify-center size-9 sm:w-auto sm:h-auto sm:px-5 sm:py-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-white/90 transition-all backdrop-blur-md cursor-pointer">
 <span className="material-symbols-outlined text-[18px] sm:hidden">close</span>
 <span className="hidden sm:inline font-medium tracking-wider text-xs ">Cancel</span>
 </button>
 <button onClick={handleShare} disabled={isGenerating} className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 text-white transition-all backdrop-blur-md shadow-lg cursor-pointer disabled:opacity-50">
 <span className="material-symbols-outlined text-[16px] sm:text-[18px]">share</span>
 <span className="font-semibold tracking-wider text-[10px] sm:text-xs ">Share</span>
 </button>
 <button onClick={handleDownload} disabled={isGenerating} className="flex items-center justify-center gap-2 px-4 sm:px-7 py-2 sm:py-2.5 rounded-full bg-white hover:bg-gray-100 text-[#1a0f08] transition-all shadow-[0_0_20px_rgba(255,255,255,0.15)] cursor-pointer disabled:opacity-50">
 <span className="material-symbols-outlined text-[16px] sm:text-[18px]">download</span>
 <span className="font-bold tracking-wider text-[10px] sm:text-xs ">Save</span>
 </button>
 </div>
 </div>

 <div
 id="invoice-print-area"
 onClick={() => setIsZoomed(true)}
 className="w-full max-w-[800px] overflow-hidden rounded-xl shadow-2xl relative bg-white shrink-0 cursor-pointer sm:cursor-default min-h-[400px] sm:min-h-[calc(800px*1.414)]"
 >
 <InvoiceDocument isZoomed={false} />
 </div>
 </div>
 )}
 </div>
 );

 if (!mounted) return null;
 return createPortal(step === 'form' ? formContent : previewContent, document.body);
}
