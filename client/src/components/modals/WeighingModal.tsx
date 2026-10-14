import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Order, PaymentStatus } from '../../types';
import { 
  X, 
  Scale, 
  IndianRupee, 
  CreditCard, 
  Banknote, 
  CheckCircle, 
  FileText, 
  AlertCircle 
} from 'lucide-react';

export const WeighingModal: React.FC<{ 
  order: Order | null; 
  onClose: () => void; 
}> = ({ order, onClose }) => {
  const { recordWeighingAndSettle, t } = useApp();

  const [weightKg, setWeightKg] = useState<number>(order?.actualWeightKg || 25);
  const [paymentMode, setPaymentMode] = useState<PaymentStatus>('paid_upi_demo');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (!order) return null;

  const agreedRate = order.agreedRatePerKg;
  const calculatedTotal = Math.round(weightKg * agreedRate);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (weightKg <= 0) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await recordWeighingAndSettle({
        orderId: order.id,
        actualWeightKg: Number(weightKg),
        paymentStatus: paymentMode,
        transactionNotes: notes,
      });
      onClose();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Could not settle this order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="bg-forest-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-forest-800 flex items-center justify-center text-emerald-400">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Record Actual Scale Weight</h3>
              <p className="text-xs text-forest-200">
                Order #{order.id} • {order.sellerName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-forest-300 hover:text-white hover:bg-forest-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {submitError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{submitError}</p>}
          
          {/* Rate reminder banner */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-mint-50 border border-forest-100 text-xs">
            <div>
              <span className="text-slate-500">Agreed Item Rate:</span>
              <div className="font-bold text-forest-900 capitalize text-sm">
                {order.category.replace('_', ' ')} ({order.subcategory})
              </div>
            </div>
            <div className="text-right">
              <span className="text-slate-500">Fixed Rate</span>
              <div className="font-extrabold text-forest-900 text-base font-mono">
                ₹{agreedRate} / kg
              </div>
            </div>
          </div>

          {/* Large Touch-friendly Weight Input */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Actual Scale Weight (in Kilograms)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="5000"
                value={weightKg}
                onChange={(e) => setWeightKg(parseFloat(e.target.value) || 0)}
                required
                className="w-full text-center text-3xl font-black font-mono py-3.5 px-4 rounded-2xl border-2 border-forest-600 focus:outline-hidden focus:ring-4 focus:ring-emerald-500/20 text-slate-900 bg-white shadow-inner"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                KG
              </span>
            </div>

            {/* Quick adjust chips */}
            <div className="flex items-center justify-center gap-2 pt-1">
              {[5, 10, 20, 35, 50].map((val) => (
                <button
                  type="button"
                  key={val}
                  onClick={() => setWeightKg(val)}
                  className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-forest-100 hover:text-forest-800 text-slate-600 transition-colors"
                >
                  +{val}kg
                </button>
              ))}
            </div>
          </div>

          {/* Auto-Calculated Final Settlement Amount */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-forest-800 to-forest-900 text-white flex items-center justify-between shadow-soft">
            <div>
              <div className="text-xs text-forest-200">Total Payable Amount</div>
              <div className="text-xs text-forest-300 font-mono">
                {weightKg} kg × ₹{agreedRate}
              </div>
            </div>
            <div className="text-3xl font-black font-mono text-emerald-400 flex items-center">
              ₹{calculatedTotal}
            </div>
          </div>

          {/* Payment Method Selection (Demo Mode clearly stated) */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Settlement Payment Mode (Demo Mode)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMode('paid_upi_demo')}
                className={`p-3 rounded-2xl border flex items-center gap-3 text-left transition-all ${
                  paymentMode === 'paid_upi_demo'
                    ? 'border-forest-600 bg-mint-50/80 text-forest-950 font-bold ring-2 ring-forest-600/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold">UPI QR Code</div>
                  <div className="text-[10px] text-slate-400">Demo Instant Settlement</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMode('paid_cash_demo')}
                className={`p-3 rounded-2xl border flex items-center gap-3 text-left transition-all ${
                  paymentMode === 'paid_cash_demo'
                    ? 'border-forest-600 bg-mint-50/80 text-forest-950 font-bold ring-2 ring-forest-600/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Banknote className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold">Cash On Delivery</div>
                  <div className="text-[10px] text-slate-400">Physical Cash Handover</div>
                </div>
              </button>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-600">
              Inspection / Scale Remarks (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Clean dry paper, zero moisture deductions."
              className="w-full text-xs py-2 px-3 rounded-xl border border-slate-200 focus:outline-hidden focus:border-forest-500"
            />
          </div>

          {/* Compliance notice */}
          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500">
            <AlertCircle className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <span>
              {t.disclaimer.demoPaymentNotice} Submitting will mark this order Completed and generate a printable digital voucher.
            </span>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || weightKg <= 0}
            className="w-full py-3.5 px-4 rounded-2xl bg-forest-800 hover:bg-forest-900 text-white font-bold text-sm shadow-md shadow-forest-900/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>{isSubmitting ? 'Recording...' : 'Confirm Weighing & Generate Receipt'}</span>
          </button>

        </form>

      </div>
    </div>
  );
};
