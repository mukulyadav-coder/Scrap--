import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { MaterialCategory } from '../../types';
import { 
  Factory, 
  Layers, 
  SlidersHorizontal, 
  TrendingUp, 
  Truck, 
  Building2, 
  PlusCircle, 
  Sparkles, 
  CheckCircle2, 
  MapPin, 
  Weight 
} from 'lucide-react';

export const BulkBuyerDashboard: React.FC = () => {
  const { 
    currentUser, 
    bulkRequirements, 
    publishBulkRequirement, 
    orders,
  } = useApp();

  const [isPublishing, setIsPublishing] = useState(false);
  const [newCat, setNewCat] = useState<MaterialCategory>('cardboard');
  const [newSubcat, setNewSubcat] = useState('Corrugated OCC Cartons');
  const [minQty, setMinQty] = useState(500);
  const [offeredRate, setOfferedRate] = useState(16.0);
  const [purityGrade, setPurityGrade] = useState('A-Grade Dry (<5% moisture)');
  const [locality, setLocality] = useState(currentUser.locality);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const myRequirements = bulkRequirements.filter(b => b.buyerId === currentUser.id);
  const myOrders = orders.filter((order) => order.buyerId === currentUser.id);
  const completedOrders = myOrders.filter((order) => order.status === 'completed');
  const totalSourcedKg = completedOrders.reduce((total, order) => total + (order.actualWeightKg || 0), 0);
  const scheduledOrders = myOrders.filter((order) => order.status === 'pickup_scheduled');

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    try {
      await publishBulkRequirement({
        category: newCat,
        subcategory: newSubcat,
        minQuantityKg: Number(minQty),
        offeredRatePerKg: Number(offeredRate),
        purityGrade,
        locality,
        validTill: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      });
      setIsPublishing(false);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Could not publish the requirement.');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-forest-950 to-forest-900 text-white shadow-soft relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
            <Building2 className="w-3.5 h-3.5" />
            Procurement account: {currentUser.id} • {currentUser.locality}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            {currentUser.businessName || currentUser.name}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300">
            Factory gate procurement desk. Sourcing high-volume recyclable fractions from local kabadiwala networks.
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <button
              onClick={() => setIsPublishing(!isPublishing)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-forest-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition-transform active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Publish Factory Buying Rate Card</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      {submitError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{submitError}</p>}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-card">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Total Sourced Volume
          </span>
          <div className="text-2xl font-black font-mono text-forest-900 mt-1">
            {(totalSourcedKg / 1000).toFixed(2)} <span className="text-xs font-normal text-slate-500">Tonnes</span>
          </div>
          <span className="text-[11px] text-emerald-700 font-semibold">{totalSourcedKg} kg in completed orders</span>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-card">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Active Procurement Specs
          </span>
          <div className="text-2xl font-black font-mono text-slate-900 mt-1">
            {myRequirements.length}
          </div>
          <span className="text-[11px] text-slate-500">Live rate cards published</span>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-card">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Supplier Network
          </span>
          <div className="text-2xl font-black font-mono text-purple-900 mt-1">
            {completedOrders.length} completed orders
          </div>
          <span className="text-[11px] text-purple-700 font-semibold">Recorded for this account</span>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-card">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Weighbridge Accuracy
          </span>
          <div className="text-2xl font-black font-mono text-emerald-600 mt-1">
            {scheduledOrders.length}
          </div>
          <span className="text-[11px] text-slate-500">Orders awaiting collection</span>
        </div>
      </div>

      {/* Collapsible Publish New Rate Card Form */}
      {isPublishing && (
        <form onSubmit={handlePublish} className="p-6 rounded-3xl bg-white border-2 border-forest-600 shadow-soft-lg space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-forest-700" />
              Publish New Industrial Buying Rate Card
            </h3>
            <button
              type="button"
              onClick={() => setIsPublishing(false)}
              className="text-xs text-slate-400 hover:text-slate-700"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Category</label>
              <select
                value={newCat}
                onChange={(e) => setNewCat(e.target.value as MaterialCategory)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200"
              >
                <option value="cardboard">Cardboard</option>
                <option value="paper">Paper</option>
                <option value="plastic">Plastic</option>
                <option value="metal">Metal</option>
                <option value="e_waste">E-Waste</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Subcategory / Grade</label>
              <input
                type="text"
                value={newSubcat}
                onChange={(e) => setNewSubcat(e.target.value)}
                required
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Factory Gate Rate (₹/kg)</label>
              <input
                type="number"
                step="0.5"
                value={offeredRate}
                onChange={(e) => setOfferedRate(parseFloat(e.target.value) || 0)}
                required
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 font-mono font-bold"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Min Lot Size (kg)</label>
              <input
                type="number"
                value={minQty}
                onChange={(e) => setMinQty(parseInt(e.target.value) || 0)}
                required
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Purity / Acceptance Criteria</label>
              <input
                type="text"
                value={purityGrade}
                onChange={(e) => setPurityGrade(e.target.value)}
                required
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Delivery Factory / Yard Location</label>
              <input
                type="text"
                value={locality}
                onChange={(e) => setLocality(e.target.value)}
                required
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-forest-800 hover:bg-forest-900 text-white font-bold text-xs shadow-xs"
            >
              Publish to Regional Collector Network
            </button>
          </div>
        </form>
      )}

      {/* Published Rate Cards List */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-soft space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-forest-700" />
            Your Live Sourcing Price Catalog
          </h3>
          <span className="text-xs text-slate-400">Broadcasted to verified collectors</span>
        </div>

        <div className="divide-y divide-slate-100">
          {myRequirements.map((r) => (
            <div key={r.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-800">
                    {r.category.replace('_', ' ')}
                  </span>
                  <span className="font-bold text-slate-900 text-sm">{r.subcategory}</span>
                </div>
                <div className="text-slate-500">
                  Acceptance: {r.purityGrade} • Min Lot: <strong>{r.minQuantityKg} kg</strong>
                </div>
                <div className="text-slate-400 text-[11px] flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {r.locality}
                </div>
              </div>

              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Factory Price</span>
                <span className="text-lg font-black font-mono text-forest-900">
                  ₹{r.offeredRatePerKg} <span className="text-xs text-slate-400 font-normal">/ kg</span>
                </span>
                <span className="text-[10px] text-emerald-700 font-semibold">Active & Accepting Lots</span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
