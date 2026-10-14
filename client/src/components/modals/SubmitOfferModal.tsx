import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { WasteListing } from '../../types';
import { 
  X, 
  Send, 
  IndianRupee, 
  Clock, 
  MapPin, 
  Weight, 
  Sparkles, 
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

export const SubmitOfferModal: React.FC<{ 
  listing: WasteListing | null; 
  onClose: () => void; 
}> = ({ listing, onClose }) => {
  const { submitOffer, indicativeRates } = useApp();

  // Find indicative rate for reference
  const matchingRate = indicativeRates.find(r => r.category === listing?.category);
  const defaultRate = matchingRate ? Math.round((matchingRate.minPrice + matchingRate.maxPrice) / 2) : 15;

  const [offeredRate, setOfferedRate] = useState<number>(defaultRate);
  const [proposedTime, setProposedTime] = useState<string>('Today between 4:00 PM - 6:00 PM');
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (!listing) return null;

  const estimatedTotal = Math.round(offeredRate * listing.estimatedWeightKg);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (offeredRate <= 0) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await submitOffer({
        listingId: listing.id,
        offeredRatePerKg: Number(offeredRate),
        proposedPickupTime: proposedTime,
        note,
      });
      onClose();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Could not submit the offer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-forest-900 text-white p-5 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base">Submit Pickup Offer</h3>
            <p className="text-xs text-forest-200">
              Quoting for {listing.sellerName} • {listing.locality}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-forest-300 hover:text-white hover:bg-forest-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Listing preview card */}
        <div className="p-4 bg-slate-50 border-b border-slate-200/80 flex items-center gap-3">
          <img
            src={listing.photos[0] || 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=200'}
            alt={listing.category}
            className="w-16 h-16 rounded-2xl object-cover border border-slate-200"
          />
          <div className="text-xs space-y-0.5">
            <span className="font-bold text-slate-900 capitalize text-sm block">
              {listing.category.replace('_', ' ')}: {listing.subcategory}
            </span>
            <div className="text-slate-500 flex items-center gap-3">
              <span className="flex items-center gap-1 font-semibold text-forest-800">
                <Weight className="w-3.5 h-3.5" /> Approx {listing.estimatedWeightKg} kg
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> {listing.locality}
              </span>
            </div>
            {matchingRate && (
              <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Mandi Benchmark: ₹{matchingRate.minPrice} - ₹{matchingRate.maxPrice}/kg
              </div>
            )}
          </div>
        </div>

        {/* Offer Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {submitError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{submitError}</p>}
          
          {/* Rate per kg */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Your Offered Rate (₹ per kg)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.5"
                min="1"
                max="2000"
                value={offeredRate}
                onChange={(e) => setOfferedRate(parseFloat(e.target.value) || 0)}
                required
                className="w-full text-center text-2xl font-bold font-mono py-2.5 px-4 rounded-2xl border-2 border-forest-600 focus:outline-hidden focus:ring-4 focus:ring-emerald-500/20 text-slate-900 bg-white"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                ₹
              </span>
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                / KG
              </span>
            </div>

            {/* Quick adjustment buttons */}
            <div className="flex items-center justify-center gap-1.5 pt-1">
              {matchingRate && (
                <>
                  <button
                    type="button"
                    onClick={() => setOfferedRate(matchingRate.minPrice)}
                    className="px-2 py-0.5 rounded-lg text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-600"
                  >
                    Min: ₹{matchingRate.minPrice}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOfferedRate(Math.round((matchingRate.minPrice + matchingRate.maxPrice) / 2))}
                    className="px-2 py-0.5 rounded-lg text-[11px] bg-forest-100 text-forest-800 font-semibold"
                  >
                    Avg: ₹{Math.round((matchingRate.minPrice + matchingRate.maxPrice) / 2)}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOfferedRate(matchingRate.maxPrice)}
                    className="px-2 py-0.5 rounded-lg text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-600"
                  >
                    Max: ₹{matchingRate.maxPrice}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Estimated Total Calculation */}
          <div className="p-3.5 rounded-2xl bg-mint-50 border border-forest-100 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-500 font-medium">Estimated Payout to Seller</span>
              <div className="text-[11px] text-forest-700">
                {listing.estimatedWeightKg} kg × ₹{offeredRate}/kg
              </div>
            </div>
            <div className="text-xl font-black text-forest-900 font-mono">
              ₹{estimatedTotal}
            </div>
          </div>

          {/* Proposed Pickup Time */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Proposed Pickup Time Slot
            </label>
            <input
              type="text"
              value={proposedTime}
              onChange={(e) => setProposedTime(e.target.value)}
              required
              placeholder="e.g. Today at 5:30 PM or Tomorrow morning"
              className="w-full text-xs py-2.5 px-3 rounded-xl border border-slate-200 focus:outline-hidden focus:border-forest-500"
            />
          </div>

          {/* Note to Seller */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-600">
              Message / Notes to Seller
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Certified scale, bringing vehicle directly to address"
              className="w-full text-xs py-2 px-3 rounded-xl border border-slate-200 focus:outline-hidden focus:border-forest-500"
            />
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={isSubmitting || offeredRate <= 0}
            className="w-full py-3.5 px-4 rounded-2xl bg-forest-800 hover:bg-forest-900 text-white font-bold text-sm shadow-md shadow-forest-900/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            <Send className="w-4 h-4 text-emerald-400" />
            <span>{isSubmitting ? 'Submitting...' : 'Send Scrap Offer to Seller'}</span>
          </button>

        </form>

      </div>
    </div>
  );
};
