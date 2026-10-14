import React from 'react';
import { useApp } from '../../context/AppContext';
import { Order } from '../../types';
import { 
  Truck, 
  Scale, 
  Warehouse, 
  Layers, 
  IndianRupee, 
  MapPin, 
  Clock, 
  ArrowRight, 
  ShieldCheck, 
  CheckCircle2, 
  TrendingUp, 
  Radio, 
  Sparkles 
} from 'lucide-react';

export const KabadiwalaDashboard: React.FC<{ onOpenWeighing: (order: Order) => void }> = ({ onOpenWeighing }) => {
  const { 
    currentUser, 
    listings, 
    orders, 
    inventory, 
    bulkRequirements, 
    setActiveTab, 
    t, 
    language 
  } = useApp();

  const pendingPickups = orders.filter(o => o.status === 'pickup_scheduled');
  const completedOrders = orders.filter(o => o.status === 'completed');
  const totalCollectedKg = completedOrders.reduce((total, order) => total + (order.actualWeightKg || 0), 0);
  const nearbyListings = listings.filter(l => l.status === 'pending');
  const totalGodownStockKg = inventory.reduce((acc, curr) => acc + curr.currentStockKg, 0);

  return (
    <div className="space-y-6">
      
      {/* Collector Business Header */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-forest-900 via-forest-800 to-forest-950 text-white shadow-soft relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
            <ShieldCheck className="w-3.5 h-3.5" />
            {currentUser.isVerified ? 'Verified' : 'Unverified'} Collector ID: {currentUser.id} • {currentUser.businessName || currentUser.name}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            {language === 'hi' ? 'आज का व्यापार एवं पिकअप' : "Today's Collection Operations"}
          </h1>
          <p className="text-xs sm:text-sm text-forest-200">
            {pendingPickups.length} scheduled doorstep visits • {nearbyListings.length} available scrap listings waiting for offers.
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <button
              onClick={() => setActiveTab('feed')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-forest-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition-transform active:scale-95"
            >
              <Radio className="w-4 h-4" />
              <span>Browse Nearby Scrap Feed ({nearbyListings.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('bulk_market')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition-colors"
            >
              <Layers className="w-4 h-4" />
              <span>Sell Godown Stock to Bulk Buyers</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/80 shadow-card">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Scheduled Visits</span>
            <Truck className="w-4 h-4 text-forest-700" />
          </div>
          <div className="text-2xl font-black font-mono text-forest-900 mt-2">
            {pendingPickups.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Pickups awaiting scale weighing
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/80 shadow-card">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Godown Stockpile</span>
            <Warehouse className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black font-mono text-forest-900 mt-2">
            {totalGodownStockKg} <span className="text-xs text-slate-500 font-normal">kg</span>
          </div>
          <div className="text-[11px] text-emerald-700 font-semibold mt-1">
            Ready for bulk aggregation
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/80 shadow-card">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Volume Collected</span>
            <Scale className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 mt-2">
            {totalCollectedKg} <span className="text-xs text-slate-500 font-normal">kg</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Across {completedOrders.length} completed transactions
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/80 shadow-card">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Collector Rating</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black font-mono text-amber-600 mt-2 flex items-center gap-1">
            —
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Rating data is not available yet
          </div>
        </div>

      </div>

      {/* Two Column Layout: Pending Pickups Action List & High Margin Bulk Buyer Deals */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Scheduled Pickups Needing Weighing */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-soft space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-forest-800">
                Action Required
              </span>
              <h3 className="text-base font-bold text-slate-900">
                Scheduled Pickups Awaiting Weighing
              </h3>
            </div>
            <button
              onClick={() => setActiveTab('orders')}
              className="text-xs font-bold text-forest-800 hover:text-emerald-600"
            >
              View All
            </button>
          </div>

          {pendingPickups.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <div className="text-xs font-bold text-slate-800">All pickups cleared!</div>
              <p className="text-[11px] text-slate-500">
                Browse the Nearby Scrap Feed to submit offers on newly listed scrap in your neighborhood.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingPickups.map((order) => (
                <div
                  key={order.id}
                  className="p-4 rounded-2xl bg-mint-50/50 border border-forest-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">
                        {order.sellerName}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-forest-100 text-forest-800 capitalize">
                        {order.category.replace('_', ' ')}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{order.sellerAddress}</span>
                    </p>

                    <div className="text-xs text-forest-900 font-semibold flex items-center gap-3">
                      <span>Agreed: ₹{order.agreedRatePerKg}/kg</span>
                      <span>•</span>
                      <span>Slot: {order.scheduledSlot}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => onOpenWeighing(order)}
                    className="px-4 py-2.5 rounded-xl bg-forest-800 hover:bg-forest-900 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 shrink-0"
                  >
                    <Scale className="w-4 h-4 text-emerald-400" />
                    <span>{t.actions.recordWeight}</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Bulk Buyer Arbitrage Preview */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-soft space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700">
                Bulk Market Margin
              </span>
              <h3 className="text-base font-bold text-slate-900">
                Sell Inventory to Industrial Recyclers
              </h3>
            </div>
            <button
              onClick={() => setActiveTab('bulk_market')}
              className="text-xs font-bold text-purple-700 hover:text-purple-900"
            >
              Explore
            </button>
          </div>

          <p className="text-xs text-slate-500">
            Compare industrial factory gate buying prices against your collection costs to realize high margins on aggregated lots.
          </p>

          <div className="space-y-2.5">
            {bulkRequirements.slice(0, 3).map((br) => (
              <div
                key={br.id}
                className="p-3.5 rounded-2xl bg-purple-50/50 border border-purple-100 space-y-1.5 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-purple-950">{br.companyName}</span>
                  <span className="font-mono font-bold text-purple-900 text-sm">
                    ₹{br.offeredRatePerKg}/kg
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 flex items-center justify-between">
                  <span>Buying: {br.subcategory}</span>
                  <span className="font-semibold text-purple-800">Min {br.minQuantityKg} kg</span>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => setActiveTab('bulk_market')}
            className="w-full py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
          >
            <span>Compare Arbitrage Margins</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>

    </div>
  );
};
