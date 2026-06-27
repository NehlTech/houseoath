'use client';

import { useRef, useState } from 'react';
import { Client, DesignIllustration, Payment } from '@/context/StudioContext';
import { defaultMeasurements, defaultFittings } from '@/context/ClientContext';
import { validateImageFile } from '@/lib/validateImage';
import ReceiptPreviewModal from '@/components/tabs/ReceiptPreviewModal';
import InvoicePreviewModal from '@/components/tabs/InvoicePreviewModal';

const todayIso = () => new Date().toISOString().split('T')[0];

function buildWalkInClient(fields: {
  name: string;
  phone: string;
  email: string;
  eventName: string;
  fabricVendor: string;
  notes: string;
  watermarkImage: string;
}): Client {
  const now = new Date().toISOString();
  const illustrations: DesignIllustration[] = fields.watermarkImage
    ? [{
        id: `walkin-illust-${Date.now()}`,
        name: 'Walk-in Reference Image',
        version: '1',
        type: 'Reference',
        image: fields.watermarkImage,
        status: 'Approved',
        notes: '',
        colors: [],
        timeline: { start: now, lastRevised: now, revisions: 0 },
        comments: [],
      }]
    : [];
  return {
    id: `walkin-${crypto.randomUUID()}`,
    name: fields.name.trim(),
    email: fields.email.trim(),
    gender: '',
    dateOfBirth: '',
    phone: fields.phone.trim(),
    profession: '',
    address: '',
    state: '',
    country: '',
    eventName: fields.eventName.trim(),
    eventDate: '',
    eventLocation: '',
    eventMonth: '',
    kenteVendor: '',
    fabricVendor: fields.fabricVendor.trim(),
    howDidYouHear: '',
    referralSource: '',
    comments: '',
    notes: fields.notes.trim(),
    fabricNotes: '',
    clientPhoto: '',
    fabricPhotos: [],
    illustrations,
    clientPhotos: [],
    measurements: defaultMeasurements,
    fittings: defaultFittings,
    payments: [],
    totalCost: 0,
    timeline: [],
    status: 'Active',
    createdAt: now,
    lastActivity: now,
    startDate: '',
    nextFittingDate: '',
    deliveryDate: '',
    productionNotes: [],
  };
}

export default function WalkInBillingPanel() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [eventName, setEventName] = useState('');
  const [fabricVendor, setFabricVendor] = useState('');
  const [notes, setNotes] = useState('');

  const [totalCost, setTotalCost] = useState('');
  const [previouslyPaid, setPreviouslyPaid] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentDate, setPaymentDate] = useState(todayIso());
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');

  const [watermarkImage, setWatermarkImage] = useState('');
  const [imageError, setImageError] = useState('');
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [docToShow, setDocToShow] = useState<'receipt' | 'invoice' | null>(null);
  const [stubClient, setStubClient] = useState<Client | null>(null);
  const [stubPayment, setStubPayment] = useState<Payment | null>(null);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setImageError('');
    const err = await validateImageFile(file);
    if (err) { setImageError(err); return; }
    const reader = new FileReader();
    reader.onload = ev => setWatermarkImage(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const sharedFields = { name, phone, email, eventName, fabricVendor, notes, watermarkImage };
  const nameValid = name.trim().length > 0;
  const totalCostNum = parseFloat(totalCost) || 0;
  const previouslyPaidNum = parseFloat(previouslyPaid) || 0;
  const amountPaidNum = parseFloat(amountPaid) || 0;
  const receiptValid = nameValid && totalCostNum > 0 && amountPaidNum > 0;

  const handleGenerateInvoice = () => {
    if (!nameValid) return;
    setStubClient(buildWalkInClient(sharedFields));
    setDocToShow('invoice');
  };

  const handleGenerateReceipt = () => {
    if (!receiptValid) return;
    const randomHash = crypto.randomUUID().replace(/-/g, '').substring(0, 8).toUpperCase();
    const payment: Payment = {
      id: `walkin-pay-${Date.now()}`,
      date: paymentDate,
      amount: amountPaidNum,
      method: paymentMethod,
      receiptNumber: `HOF-${randomHash}`,
    };
    const previousEntries: Payment[] =
      previouslyPaidNum > 0
        ? [{ id: `walkin-prev-${Date.now()}`, date: paymentDate, amount: previouslyPaidNum, method: 'Previous Payment' }]
        : [];

    const client = buildWalkInClient(sharedFields);
    client.totalCost = totalCostNum;
    client.payments = [...previousEntries, payment];

    setStubClient(client);
    setStubPayment(payment);
    setDocToShow('receipt');
  };

  const closeDoc = () => {
    setDocToShow(null);
    setStubClient(null);
    setStubPayment(null);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h4 className="font-display font-bold text-xl tracking-wide text-charcoal mb-1">Walk-in Billing</h4>
        <p className="text-sm text-gray font-medium">
          Generate a receipt or invoice for someone who hasn&apos;t been added as a client yet. The document looks
          and behaves exactly like the ones generated from a client record.
        </p>
      </div>

      {/* Shared details */}
      <div className="bg-canvas p-5 md:p-6 rounded-2xl space-y-4">
        <p className="text-xs font-bold tracking-wider text-gray">Client Details</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="walkin-name" className="block text-xs font-bold tracking-wider text-gray mb-2">
              Name <span className="text-primary">*</span>
            </label>
            <input
              id="walkin-name"
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Ama Boateng"
              className="w-full bg-white shadow-sm border-none text-charcoal rounded-xl h-12 px-4 focus:ring-1 focus:ring-primary transition-all outline-none placeholder-muted"
            />
          </div>
          <div>
            <label htmlFor="walkin-phone" className="block text-xs font-bold tracking-wider text-gray mb-2">Phone</label>
            <input
              id="walkin-phone"
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="024 000 0000"
              className="w-full bg-white shadow-sm border-none text-charcoal rounded-xl h-12 px-4 focus:ring-1 focus:ring-primary transition-all outline-none placeholder-muted"
            />
          </div>
          <div>
            <label htmlFor="walkin-email" className="block text-xs font-bold tracking-wider text-gray mb-2">Email</label>
            <input
              id="walkin-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="ama@example.com"
              className="w-full bg-white shadow-sm border-none text-charcoal rounded-xl h-12 px-4 focus:ring-1 focus:ring-primary transition-all outline-none placeholder-muted"
            />
          </div>
          <div>
            <label htmlFor="walkin-event" className="block text-xs font-bold tracking-wider text-gray mb-2">Event / Description</label>
            <input
              id="walkin-event"
              type="text"
              value={eventName}
              onChange={e => setEventName(e.target.value)}
              placeholder="e.g. Wedding Outfit"
              className="w-full bg-white shadow-sm border-none text-charcoal rounded-xl h-12 px-4 focus:ring-1 focus:ring-primary transition-all outline-none placeholder-muted"
            />
          </div>
          <div>
            <label htmlFor="walkin-fabric" className="block text-xs font-bold tracking-wider text-gray mb-2">Fabric Vendor</label>
            <input
              id="walkin-fabric"
              type="text"
              value={fabricVendor}
              onChange={e => setFabricVendor(e.target.value)}
              placeholder="Optional"
              className="w-full bg-white shadow-sm border-none text-charcoal rounded-xl h-12 px-4 focus:ring-1 focus:ring-primary transition-all outline-none placeholder-muted"
            />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="walkin-notes" className="block text-xs font-bold tracking-wider text-gray mb-2">Notes (shown on receipt)</label>
            <textarea
              id="walkin-notes"
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Optional"
              className="w-full bg-white shadow-sm border-none text-charcoal rounded-xl px-4 py-3 resize-none focus:ring-1 focus:ring-primary transition-all outline-none placeholder-muted"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold tracking-wider text-gray mb-2">Background Image (watermark)</label>
            <p className="text-xs text-muted mb-3">
              Same faint background image used on a real client&apos;s receipt/invoice — upload a design sketch, render, or any reference image.
            </p>
            <div className="flex items-center gap-4">
              {watermarkImage ? (
                <div className="relative shrink-0">
                  <img src={watermarkImage} alt="Watermark preview" className="h-16 w-16 rounded-xl object-cover shadow-sm" />
                  <button
                    onClick={() => setWatermarkImage('')}
                    className="absolute -top-1.5 -right-1.5 h-5 w-5 bg-danger rounded-full flex items-center justify-center shadow-sm"
                    aria-label="Remove image"
                  >
                    <span className="material-symbols-outlined text-[10px] text-white">close</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => imageInputRef.current?.click()}
                  className="h-16 w-16 rounded-xl border-2 border-dashed border-border flex items-center justify-center text-muted hover:border-primary hover:text-primary transition-colors shrink-0"
                  aria-label="Upload background image"
                >
                  <span className="material-symbols-outlined text-[22px]">add_photo_alternate</span>
                </button>
              )}
              <button
                onClick={() => imageInputRef.current?.click()}
                className="px-4 py-2 bg-white border border-border rounded-lg text-xs font-bold text-charcoal hover:bg-border/30 transition-colors"
              >
                {watermarkImage ? 'Replace Image' : 'Upload Image'}
              </button>
            </div>
            {imageError && <p className="text-xs text-danger mt-2">{imageError}</p>}
            <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleGenerateInvoice}
            disabled={!nameValid}
            className="flex items-center gap-2 px-6 py-2.5 bg-canvas border border-border text-charcoal font-bold tracking-wide rounded-xl shadow-sm hover:bg-border/50 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-[18px]">description</span>
            Continue to Invoice
          </button>
        </div>
      </div>

      {/* Receipt-only details */}
      <div className="bg-canvas p-5 md:p-6 rounded-2xl space-y-4">
        <p className="text-xs font-bold tracking-wider text-gray">Receipt Details</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="walkin-total" className="block text-xs font-bold tracking-wider text-gray mb-2">
              Total Job Cost (GHS) <span className="text-primary">*</span>
            </label>
            <input
              id="walkin-total"
              type="number"
              min="0"
              value={totalCost}
              onChange={e => setTotalCost(e.target.value)}
              placeholder="0.00"
              className="w-full bg-white shadow-sm border-none text-charcoal rounded-xl h-12 px-4 focus:ring-1 focus:ring-primary transition-all outline-none placeholder-muted"
            />
          </div>
          <div>
            <label htmlFor="walkin-prev-paid" className="block text-xs font-bold tracking-wider text-gray mb-2">Previously Paid (GHS)</label>
            <input
              id="walkin-prev-paid"
              type="number"
              min="0"
              value={previouslyPaid}
              onChange={e => setPreviouslyPaid(e.target.value)}
              placeholder="0.00"
              className="w-full bg-white shadow-sm border-none text-charcoal rounded-xl h-12 px-4 focus:ring-1 focus:ring-primary transition-all outline-none placeholder-muted"
            />
          </div>
          <div>
            <label htmlFor="walkin-amount-paid" className="block text-xs font-bold tracking-wider text-gray mb-2">
              Amount Paid Now (GHS) <span className="text-primary">*</span>
            </label>
            <input
              id="walkin-amount-paid"
              type="number"
              min="0"
              value={amountPaid}
              onChange={e => setAmountPaid(e.target.value)}
              placeholder="0.00"
              className="w-full bg-white shadow-sm border-none text-charcoal rounded-xl h-12 px-4 focus:ring-1 focus:ring-primary transition-all outline-none placeholder-muted"
            />
          </div>
          <div>
            <label htmlFor="walkin-pay-date" className="block text-xs font-bold tracking-wider text-gray mb-2">Payment Date</label>
            <input
              id="walkin-pay-date"
              type="date"
              value={paymentDate}
              onChange={e => setPaymentDate(e.target.value)}
              className="w-full bg-white shadow-sm border-none text-charcoal rounded-xl h-12 px-4 focus:ring-1 focus:ring-primary transition-all outline-none"
            />
          </div>
          <div>
            <label htmlFor="walkin-method" className="block text-xs font-bold tracking-wider text-gray mb-2">Payment Method</label>
            <select
              id="walkin-method"
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value)}
              className="w-full bg-white shadow-sm border-none text-charcoal rounded-xl h-12 px-4 focus:ring-1 focus:ring-primary transition-all outline-none"
            >
              <option>Bank Transfer</option>
              <option>Mobile Money</option>
              <option>Cash</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleGenerateReceipt}
            disabled={!receiptValid}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white font-bold tracking-wide rounded-xl shadow-md hover:shadow-lg hover:bg-[#E5C04A] transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-[18px]">receipt_long</span>
            Continue to Receipt
          </button>
        </div>
      </div>

      {docToShow === 'invoice' && stubClient && (
        <InvoicePreviewModal client={stubClient} onClose={closeDoc} />
      )}
      {docToShow === 'receipt' && stubClient && stubPayment && (
        <ReceiptPreviewModal client={stubClient} payment={stubPayment} onClose={closeDoc} />
      )}
    </div>
  );
}
