import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Sparkles, 
  PlusCircle, 
  TrendingUp, 
  Truck, 
  TreePine, 
  Receipt, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  Award,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';

export const SellerDashboard: React.FC = () => {
  const { 
    currentUser, 
    listings, 
    orders, 
    indicativeRates, 
    setActiveTab, 
    setSelectedReceiptOrder, 
    language, 
    t 
  } = useApp();

  const userListings = listings.filter(l => l.sellerId === currentUser.id);
  const activeOrders = orders.filter(o => o.sellerId === currentUser.id && (o.status === 'pickup_scheduled' || o.status === 'accepted'));
  const completedOrders = orders.filter(o => o.sellerId === currentUser.id && o.status === 'completed');
  const totalEarnings = completedOrders.reduce((total, order) => total + (order.finalAmount || 0), 0);

  const treesSaved = (currentUser.greenScoreKg / 30).toFixed(1);
  const co2Diverted = (currentUser.greenScoreKg * 1.4).toFixed(0);

  return (
    <div className="space-y-6">
      
      {/* 2026 Modern Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-forest-900 via-forest-800 to-emerald-900 text-white p-6 sm:p-8 shadow-soft">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
            <Sparkles className="w-3.5 h-3.5" />
            {language === 'hi' ? 'स्वागत है' : 'Welcome back'}, {currentUser.name}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            {language === 'hi' 
              ? 'कबाड़ बेचें, पैसे कमाएं और प्रकृति बचाएं' 
              : 'Turn Household Scrap into Instant Value'}
          </h1>
          <p className="text-xs sm:text-sm text-forest-200 leading-relaxed">
            Connect directly with verified local kabadiwalas for doorstep pickups, certified digital weighing, and instant payouts.
          </p>

          {/* Quick CTA button */}
          <div className="pt-2 flex flex-wrap gap-3">
            <button
              onClick={() => setActiveTab('sell_waste')}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-forest-950 font-bold text-xs sm:text-sm shadow-md shadow-emerald-500/30 transition-transform active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{t.actions.sellScrapNow}</span>
            </button>
            <button
              onClick={() => setActiveTab('rates')}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm border border-white/20 transition-colors"
            >
              <TrendingUp className="w-4 h-4" />
              <span>{t.actions.viewAllRates}</span>
            </button>
          </div>
        </div>

        {/* Floating Green Impact Badge */}
        <div className="hidden md:flex absolute top-6 right-6 p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 flex-col items-center text-center">
          <div className="w-10 h-10 rounded-xl bg-emerald-400 text-forest-950 flex items-center justify-center font-bold mb-1 shadow-sm">
            <TreePine className="w-5 h-5" />
          </div>
          <div className="text-xs font-bold text-emerald-300">Eco Footprint</div>
          <div className="text-lg font-black text-white font-mono mt-0.5">
            {treesSaved} Trees
          </div>
          <span className="text-[10px] text-forest-200">Preserved via recycling</span>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/80 shadow-card">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Recycled Volume</span>
            <TreePine className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black font-mono text-forest-900 mt-2">
            {currentUser.greenScoreKg} <span className="text-xs text-slate-500 font-normal">kg</span>
          </div>
          <div className="text-[11px] text-emerald-700 font-semibold mt-1">
            ~{co2Diverted} kg CO₂ prevented
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/80 shadow-card">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Earnings</span>
            <span className="text-sm font-bold text-slate-700">₹</span>
          </div>
          <div className="text-2xl font-black font-mono text-forest-900 mt-2">
            ₹{totalEarnings.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Across {currentUser.completedPickups} pickups
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/80 shadow-card">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Active Pickups</span>
            <Truck className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 mt-2">
            {activeOrders.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Collectors scheduled
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/80 shadow-card">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Verification</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className={`text-base font-bold flex items-center gap-1.5 mt-2 ${currentUser.isVerified ? 'text-emerald-700' : 'text-amber-700'}`}>
            {currentUser.isVerified ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
            {currentUser.isVerified ? 'Verified Resident' : 'Not yet verified'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 truncate">
            {currentUser.locality}
          </div>
        </div>

      </div>

      {/* Two Column Layout: Quick Rates Ticker (left) & Active Orders/Offers (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Quick Indicative Rates Ticker */}
        <div className="lg:col-span-6 bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-soft space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-forest-800">
                Live Mandi Ticker
              </span>
              <h3 className="text-base font-bold text-slate-900">
                Today's Benchmark Rates
              </h3>
            </div>
            <button
              onClick={() => setActiveTab('rates')}
              className="text-xs font-bold text-forest-800 hover:text-emerald-600 flex items-center gap-1"
            >
              <span>All Rates</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {indicativeRates.slice(0, 5).map((r) => (
              <div
                key={r.id}
                className="p-3 rounded-2xl bg-slate-50 hover:bg-forest-50/60 border border-slate-100 transition-colors flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-bold text-slate-800">
                    {language === 'hi' ? r.hindiName : r.name}
                  </span>
                  <div className="text-[10px] text-slate-400 truncate max-w-[200px]">
                    {r.marketSource}
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-black font-mono text-forest-900 text-sm">
                    ₹{r.minPrice} – ₹{r.maxPrice}
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">per kg</span>
                </div>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-slate-400 italic text-center pt-1">
            *Indicative estimates only. Exact rates mutually agreed during pickup.
          </p>
        </div>

        {/* Right: Active Listings & Orders Action Card */}
        <div className="lg:col-span-6 space-y-4">
          
          {/* Active Pickups */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-soft space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
                  Scheduled Visits
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  Pickup Status
                </h3>
              </div>
              <button
                onClick={() => setActiveTab('orders')}
                className="text-xs font-bold text-forest-800 hover:text-emerald-600 flex items-center gap-1"
              >
                <span>Track All</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {activeOrders.length === 0 ? (
              <div className="p-6 text-center bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <Clock className="w-6 h-6 text-slate-400 mx-auto" />
                <div className="text-xs font-bold text-slate-700">No scheduled visits currently</div>
                <p className="text-[11px] text-slate-400">
                  Post a listing to connect with local collectors.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeOrders.map(o => (
                  <div
                    key={o.id}
                    onClick={() => setActiveTab('orders')}
                    className="p-3.5 rounded-2xl bg-mint-50/60 border border-forest-100 flex items-center justify-between text-xs cursor-pointer hover:bg-mint-50 transition-colors"
                  >
                    <div>
                      <div className="font-bold text-forest-950 capitalize">
                        {o.category.replace('_', ' ')} ({o.subcategory})
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Collector: <strong>{o.buyerName}</strong> • {o.scheduledSlot}
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-forest-800 text-white">
                      Track
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Completed Receipts */}
          {completedOrders.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-soft space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-emerald-600" />
                  Recent Digital Receipts
                </h3>
                <span className="text-xs text-slate-400">Verified</span>
              </div>

              <div className="space-y-2">
                {completedOrders.slice(0, 2).map(co => (
                  <div
                    key={co.id}
                    className="p-3 rounded-2xl border border-slate-100 bg-slate-50 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-mono text-[10px] font-bold text-slate-400">
                        {co.receiptNumber}
                      </span>
                      <div className="font-bold text-slate-800">
                        {co.subcategory} • {co.actualWeightKg} kg
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedReceiptOrder(co)}
                      className="px-3 py-1.5 rounded-xl bg-forest-800 text-white font-bold text-[11px] hover:bg-forest-900 transition-colors"
                    >
                      View Receipt
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
