import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { WasteListing, Offer } from '../../types';
import { 
  Sparkles, 
  MapPin, 
  Clock, 
  Weight, 
  Star, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight, 
  Truck, 
  Inbox, 
  PlusCircle, 
  ChevronRight 
} from 'lucide-react';

export const SellerListingsAndOffers: React.FC = () => {
  const { listings, offers, acceptOffer, setActiveTab, t, language, indicativeRates, showToast } = useApp();
  const [selectedListingId, setSelectedListingId] = useState<string>(
    listings[0]?.id || ''
  );

  const selectedListing = listings.find(l => l.id === selectedListingId) || listings[0];
  const matchingOffers = offers.filter(o => o.listingId === selectedListing?.id);

  if (listings.length === 0) {
    return (
      <div className="max-w-xl mx-auto p-12 text-center bg-white rounded-3xl border border-slate-200/80 shadow-soft space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-forest-50 text-forest-800 flex items-center justify-center mx-auto">
          <Inbox className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">No Active Waste Listings</h3>
        <p className="text-xs text-slate-500">
          You haven't listed any scrap yet. Schedule your first pickup to receive competitive offers from local verified collectors.
        </p>
        <button
          onClick={() => setActiveTab('sell_waste')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-forest-800 hover:bg-forest-900 text-white font-bold text-xs shadow-md shadow-forest-900/20"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{t.actions.sellScrapNow}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header banner */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-forest-800 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
            Competitive Scrap Offers
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            {language === 'hi' ? 'मेरे विज्ञापन और बोलियां' : 'My Listings & Received Offers'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Compare collector bids, pickup speed, and ratings to accept the best scrap deal.
          </p>
        </div>

        <button
          onClick={() => setActiveTab('sell_waste')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-forest-800 hover:bg-forest-900 text-white text-xs font-bold shadow-md shadow-forest-900/20 shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{t.actions.sellScrapNow}</span>
        </button>
      </div>

      {/* Main Grid: Listings list (left) & Offers comparison (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Listings selector */}
        <div className="lg:col-span-5 space-y-3">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
            Your Active Waste Listings ({listings.length})
          </div>

          <div className="space-y-3">
            {listings.map((l) => {
              const active = l.id === selectedListing?.id;
              const hasAcceptedOffer = l.status === 'accepted';
              const lOffers = offers.filter(o => o.listingId === l.id);

              return (
                <div
                  key={l.id}
                  onClick={() => setSelectedListingId(l.id)}
                  className={`p-4 rounded-3xl border cursor-pointer transition-all ${
                    active
                      ? 'border-forest-700 bg-white shadow-soft ring-2 ring-forest-700/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <img
                      src={l.photos[0] || 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=200'}
                      alt={l.category}
                      className="w-16 h-16 rounded-2xl object-cover shrink-0 border border-slate-200"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {l.category.replace('_', ' ')}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          l.status === 'accepted' ? 'bg-mint-100 text-forest-800' :
                          l.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {t.status[l.status] || l.status}
                        </span>
                      </div>

                      <h4 className="font-bold text-slate-900 text-sm mt-1 truncate">
                        {l.subcategory}
                      </h4>

                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                        <span className="font-semibold text-forest-900">
                          ~{l.estimatedWeightKg} kg
                        </span>
                        <span>•</span>
                        <span className="truncate">{l.locality}</span>
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[11px]">
                        <span className="text-emerald-700 font-bold">
                          {lOffers.length} {lOffers.length === 1 ? 'Offer received' : 'Offers received'}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Detailed comparison of offers for selected listing */}
        <div className="lg:col-span-7 space-y-4">
          {selectedListing && (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-soft space-y-6">
              
              {/* Selected listing summary header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-100 gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Listing ID: {selectedListing.id}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                    {selectedListing.subcategory}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                    <span>Approx <strong>{selectedListing.estimatedWeightKg} kg</strong></span>
                    <span>•</span>
                    <span>Preferred: <strong>{selectedListing.preferredSlot}</strong></span>
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    Offers Available
                  </span>
                  <div className="text-2xl font-black font-mono text-forest-900">
                    {matchingOffers.length}
                  </div>
                </div>
              </div>

              {/* Offers Comparison Cards */}
              {matchingOffers.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                  <Clock className="w-8 h-8 text-slate-400 mx-auto" />
                  <div className="text-xs font-bold text-slate-800">
                    Broadcasting to nearby collectors...
                  </div>
                  <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                    Kabadiwalas in {selectedListing.locality} have received your request. Competitive offers typically arrive within 10-30 minutes.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Compare Buyer Quotes ({matchingOffers.length})
                  </div>

                  {matchingOffers.map((offer) => {
                    const isAccepted = offer.status === 'accepted' || selectedListing.acceptedOfferId === offer.id;

                    return (
                      <div
                        key={offer.id}
                        className={`p-5 rounded-2xl border transition-all ${
                          isAccepted
                            ? 'border-emerald-500 bg-mint-50/70 ring-2 ring-emerald-500/20'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          
                          {/* Collector Info */}
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-slate-900 text-sm">
                                {offer.buyerName}
                              </h4>
                              <ShieldCheck className="w-4 h-4 text-emerald-500" />
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 flex items-center gap-1">
                                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                {offer.buyerRating}
                              </span>
                            </div>

                            <p className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                              <span>Distance: <strong>{offer.buyerDistanceKm} km away</strong></span>
                              <span>•</span>
                              <span>Slot: <strong>{offer.proposedPickupTime}</strong></span>
                            </p>

                            {offer.note && (
                              <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-100 mt-2">
                                💬 "{offer.note}"
                              </p>
                            )}
                          </div>

                          {/* Price & Payout */}
                          <div className="text-left sm:text-right shrink-0">
                            <span className="text-[10px] font-bold uppercase text-slate-400">
                              Offered Scrap Rate
                            </span>
                            <div className="text-xl font-black font-mono text-forest-900">
                              ₹{offer.offeredRatePerKg}
                              <span className="text-xs font-semibold text-slate-500"> / kg</span>
                            </div>
                            <div className="text-xs text-forest-700 font-bold mt-0.5">
                              Est. Total: ₹{offer.totalEstimatedAmount}
                            </div>
                          </div>

                        </div>

                        {/* Bottom Actions */}
                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-[11px] text-slate-400">
                            Submitted {new Date(offer.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>

                          {isAccepted ? (
                            <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-xl">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Accepted • Pickup Scheduled</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                void acceptOffer(selectedListing.id, offer.id)
                                  .then(() => setActiveTab('orders'))
                                  .catch((error: unknown) => {
                                    showToast(error instanceof Error ? error.message : 'Could not accept this offer.', 'error');
                                  });
                              }}
                              className="px-4 py-2 rounded-xl bg-forest-800 hover:bg-forest-900 text-white font-bold text-xs shadow-sm shadow-forest-900/20 flex items-center gap-1.5 transition-colors"
                            >
                              <span>{t.actions.acceptOffer}</span>
                              <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                            </button>
                          )}
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          )}
        </div>

      </div>

    </div>
  );
};
