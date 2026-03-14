'use client';

import { useState, useRef, useEffect } from 'react';
import { Client, useStudio, Payment } from '@/context/StudioContext';
import ReceiptPreviewModal from './ReceiptPreviewModal';

interface PaymentsTabProps {
  client: Client;
}

export default function PaymentsTab({ client }: PaymentsTabProps) {
  const { addPayment, updateClient } = useStudio();
  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('Bank Transfer');
  const [editingCost, setEditingCost] = useState(false);
  const [totalCost, setTotalCost] = useState(client.totalCost.toString());
  const [selectedReceipt, setSelectedReceipt] = useState<Payment | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const amountPaid = client.payments.reduce((sum, p) => sum + p.amount, 0);
  const balance = client.totalCost - amountPaid;
  const progress = client.totalCost > 0 ? Math.round((amountPaid / client.totalCost) * 100) : 0;

  const handleAddPayment = () => {
    if (!amount || parseFloat(amount) <= 0) return;
    addPayment(client.id, { date: new Date().toISOString().split('T')[0], amount: parseFloat(amount), method });
    setAmount('');
    setShowForm(false);
  };

  const handleSaveCost = () => {
    updateClient(client.id, { totalCost: parseFloat(totalCost) || 0 });
    setEditingCost(false);
  };

  return (
    <div className="animate-fade-in space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="bg-primary/10 p-3 rounded-xl border border-primary/20">
            <span className="material-symbols-outlined text-primary text-4xl">account_balance_wallet</span>
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Payment Tracking</h1>
            <p className="text-slate-500 mt-1 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">person</span>
              {client.name}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => {
              setShowForm(true);
              setTimeout(() => {
                formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }, 100);
            }} 
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-white font-bold hover:brightness-110 shadow-lg shadow-primary/20 transition-all"
          >
            <span className="material-symbols-outlined">add</span>
            Add Payment
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <div className="flex flex-col gap-2 rounded-xl p-5 md:p-6 bg-white border border-none shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-slate-500 text-sm font-medium">Total Project Cost</p>
            {!editingCost ? (
              <button onClick={() => setEditingCost(true)} className="text-slate-400 hover:text-primary"><span className="material-symbols-outlined text-lg">edit</span></button>
            ) : (
              <button onClick={handleSaveCost} className="text-green-500"><span className="material-symbols-outlined text-lg">check</span></button>
            )}
          </div>
          {editingCost ? (
            <input type="number" value={totalCost} onChange={(e) => setTotalCost(e.target.value)} className="w-full bg-slate-50 border-none rounded-lg h-10 px-3 text-2xl font-black" />
          ) : (
            <p className="text-slate-900 tracking-tight text-2xl md:text-3xl font-black">GHS {client.totalCost.toLocaleString()}</p>
          )}
        </div>
        <div className="flex flex-col gap-2 rounded-xl p-5 md:p-6 bg-white border border-none shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12"></div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-slate-500 text-sm font-medium">Amount Paid</p>
            <span className="material-symbols-outlined text-green-500">check_circle</span>
          </div>
          <p className="text-slate-900 tracking-tight text-2xl md:text-3xl font-black">GHS {amountPaid.toLocaleString()}</p>
          <div className="flex items-center gap-1 mt-2">
            <span className="text-green-600 text-xs font-bold">{progress}% Complete</span>
            <div className="flex-1 h-1.5 bg-slate-100 rounded-full ml-2">
              <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${Math.min(progress, 100)}%` }}></div>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 rounded-xl p-5 md:p-6 bg-white border border-none shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-slate-500 text-sm font-medium">Balance Remaining</p>
            <span className="material-symbols-outlined text-primary">pending_actions</span>
          </div>
          <p className="text-slate-900 tracking-tight text-2xl md:text-3xl font-black">GHS {balance.toLocaleString()}</p>
        </div>
      </div>

      {/* Add Payment Form */}
      {showForm && (
        <div ref={formRef} className="bg-white rounded-xl p-6 shadow-sm border border-primary/10 animate-slide-up scroll-m-24">
          <h4 className="text-lg font-bold mb-4">Record Payment</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Amount (GHS)</label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00"
                className="w-full bg-white border border-none rounded-lg h-12 px-4 focus:ring-primary focus:border-primary" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Payment Method</label>
              <select value={method} onChange={(e) => setMethod(e.target.value)}
                className="w-full bg-white border border-none rounded-lg h-12 px-4 focus:ring-primary focus:border-primary">
                <option>Bank Transfer</option>
                <option>Mobile Money</option>
                <option>Cash</option>
                <option>Card</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-slate-500 text-sm font-medium">Cancel</button>
            <button onClick={handleAddPayment} className="px-6 py-2 rounded-lg bg-primary text-white font-bold text-sm shadow-lg shadow-primary/20">Record Payment</button>
          </div>
        </div>
      )}

      {/* Payment History Table & List */}
      <div className="bg-white rounded-xl border border-none shadow-sm overflow-hidden">
        <div className="p-4 md:p-6  flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">Payment History</h2>
            <p className="text-slate-500 text-xs md:text-sm">Recent transactions and verification status</p>
          </div>
        </div>

        {/* Mobile List View */}
        <div className="md:hidden divide-y divide-slate-100">
          {client.payments.length > 0 ? client.payments.map(payment => (
            <div key={payment.id} className="p-4 flex flex-col gap-2 hover:bg-slate-50 transition-colors">
               <div className="flex justify-between items-center">
                 <div className="font-extrabold text-slate-900 text-lg">GHS {payment.amount.toLocaleString()}</div>
                 <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-green-100 text-green-700">
                    <span className="size-1.5 rounded-full bg-green-600"></span> Verified
                 </span>
               </div>
               <div className="flex justify-between items-center text-xs text-slate-500 font-medium mt-1">
                 <span>{new Date(payment.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                 <div className="flex items-center gap-1">
                   <span className="material-symbols-outlined text-[14px]">account_balance</span>
                   {payment.method}
                 </div>
               </div>
               <button onClick={() => setSelectedReceipt(payment)} className="mt-2 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200 transition-colors">
                 <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                 Generate Receipt
               </button>
            </div>
          )) : (
            <div className="p-8 text-center text-slate-400 text-sm">No payments recorded yet</div>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Method</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {client.payments.length > 0 ? client.payments.map(payment => (
                <tr key={payment.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4 font-medium">{new Date(payment.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-slate-400 text-lg">account_balance</span>
                      <span className="text-sm">{payment.method}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-bold text-lg">GHS {payment.amount.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                      <span className="size-1.5 rounded-full bg-green-600"></span>
                      Verified
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => setSelectedReceipt(payment)}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-primary font-semibold text-xs transition-all"
                    >
                      <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                      Receipt
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400">No payments recorded yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Receipt Modal */}
      {selectedReceipt && (
        <ReceiptPreviewModal 
          client={client} 
          payment={selectedReceipt} 
          onClose={() => setSelectedReceipt(null)} 
        />
      )}
    </div>
  );
}
