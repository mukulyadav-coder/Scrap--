import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  ShieldCheck, 
  CheckCheck, 
  TrendingUp, 
  ShieldAlert, 
  Users, 
  ListOrdered, 
  FileSpreadsheet, 
  Building2, 
  Check, 
  X, 
  ExternalLink, 
  Edit3, 
  Sparkles,
  TreePine
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { 
    verificationRequests, 
    reviewVerification, 
    indicativeRates, 
    updateIndicativeRate, 
    complaints, 
    resolveComplaint, 
    orders, 
    listings, 
    language, 
    t,
    showToast,
  } = useApp();

  const [activeSection, setActiveSection] = useState<'verification' | 'rates' | 'disputes'>('verification');
  
  // Rate edit modal state
  const [editingRateId, setEditingRateId] = useState<string | null>(null);
  const [editMin, setEditMin] = useState<number>(0);
  const [editMax, setEditMax] = useState<number>(0);
  const [resolutionDrafts, setResolutionDrafts] = useState<Record<string, string>>({});

  const pendingVerification = verificationRequests.filter(v => v.status === 'pending');
  const openComplaints = complaints.filter(c => c.status !== 'resolved');

  const totalGMV = orders.reduce((acc, curr) => acc + (curr.finalAmount || 0), 0);
  const totalVolumeKg = orders.reduce((acc, curr) => acc + (curr.actualWeightKg || 0), 0);

  const handleStartEdit = (rate: any) => {
    setEditingRateId(rate.id);
    setEditMin(rate.minPrice);
    setEditMax(rate.maxPrice);
  };

  const handleSaveRate = async (rateId: string) => {
    try {
      await updateIndicativeRate(rateId, editMin, editMax);
      setEditingRateId(null);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not update the rate.', 'error');
    }
  };

  const handleAdminAction = (action: Promise<void>) => {
    void action.catch((error: unknown) => {
      showToast(error instanceof Error ? error.message : 'The requested admin action failed.', 'error');
    });
  };

  const handleResolveComplaint = async (complaintId: string) => {
    const notes = resolutionDrafts[complaintId]?.trim();
    if (!notes) {
      showToast('Enter the resolution notes before resolving the complaint.', 'error');
      return;
    }
    try {
      await resolveComplaint(complaintId, notes);
      setResolutionDrafts((drafts) => ({ ...drafts, [complaintId]: '' }));
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not resolve the complaint.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Admin Platform Header */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-forest-950 via-slate-900 to-forest-900 text-white shadow-soft relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
            <ShieldCheck className="w-3.5 h-3.5" />
            Platform Super-Admin Console • Governance & Trust 2026
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Kabadiwala Connect Administration
          </h1>
          <p className="text-xs sm:text-sm text-slate-300">
            Monitor real-time scrap circulation, approve collector KYC licenses, manage Mandi price indices, and resolve customer complaints.
          </p>
        </div>
      </div>

      {/* High Level Platform KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-card">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Total Transacted GMV
          </span>
          <div className="text-2xl font-black font-mono text-forest-900 mt-1">
            ₹{totalGMV.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-emerald-700 font-semibold">From recorded completed settlements</span>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-card">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Material Recycled
          </span>
          <div className="text-2xl font-black font-mono text-forest-900 mt-1">
            {(totalVolumeKg / 1000).toFixed(2)} <span className="text-xs font-normal text-slate-500">Tonnes</span>
          </div>
          <span className="text-[11px] text-emerald-700 font-semibold">From recorded completed orders</span>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-card">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Verification Queue
          </span>
          <div className="text-2xl font-black font-mono text-amber-600 mt-1">
            {pendingVerification.length} Pending
          </div>
          <span className="text-[11px] text-slate-500">Aadhaar & PCB licenses</span>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-card">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Dispute Resolution
          </span>
          <div className="text-2xl font-black font-mono text-slate-900 mt-1">
            {complaints.length - openComplaints.length} / {complaints.length} resolved
          </div>
          <span className="text-[11px] text-slate-500">{openComplaints.length} open tickets</span>
        </div>

      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveSection('verification')}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
            activeSection === 'verification'
              ? 'bg-forest-800 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <CheckCheck className="w-4 h-4" />
          <span>Collector & Buyer Verification Queue ({pendingVerification.length})</span>
        </button>

        <button
          onClick={() => setActiveSection('rates')}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
            activeSection === 'rates'
              ? 'bg-forest-800 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Mandi Rates Master Card</span>
        </button>

        <button
          onClick={() => setActiveSection('disputes')}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
            activeSection === 'disputes'
              ? 'bg-forest-800 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Disputes & Grievance Desk ({openComplaints.length})</span>
        </button>
      </div>

      {/* Section 1: Verification Queue */}
      {activeSection === 'verification' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-soft space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-slate-900">
              Business KYC & Regulated Partner Approvals
            </h3>
            <span className="text-xs text-slate-400">Verifying scales, Aadhaar, and SPCB E-waste certificates</span>
          </div>

          <div className="space-y-3">
            {verificationRequests.map((req) => (
              <div
                key={req.id}
                className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{req.userName}</span>
                    <span className="font-semibold text-slate-600">({req.businessName})</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-forest-100 text-forest-800">
                      {req.role}
                    </span>
                  </div>

                  <div className="text-slate-500">
                    Document Type: <strong>{req.idType}</strong> • ID No: <span className="font-mono">{req.idNumber}</span>
                  </div>

                  {req.notes && (
                    <div className="text-slate-500 italic text-[11px]">
                      "{req.notes}"
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {req.status === 'pending' ? (
                    <>
                      <button
                        onClick={() => handleAdminAction(reviewVerification(req.id, 'approved'))}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-forest-800 hover:bg-forest-900 text-white font-bold text-xs shadow-xs transition-colors"
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Approve KYC</span>
                      </button>
                      <button
                        onClick={() => handleAdminAction(reviewVerification(req.id, 'rejected'))}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-rose-50 text-rose-700 font-bold text-xs border border-rose-200 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </>
                  ) : (
                    <span className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase ${
                      req.status === 'approved' ? 'bg-mint-100 text-forest-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {req.status}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 2: Mandi Rates Master */}
      {activeSection === 'rates' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-soft space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Official Indicative Mandi Rate Card Editor
              </h3>
              <p className="text-xs text-slate-500">
                Changes made here immediately synchronize to all Seller and Kabadiwala dashboards.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Item Category</th>
                  <th className="py-2.5 px-3">Item Name</th>
                  <th className="py-2.5 px-3 text-right">Min Rate (₹/kg)</th>
                  <th className="py-2.5 px-3 text-right">Max Rate (₹/kg)</th>
                  <th className="py-2.5 px-3">Benchmark Source</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {indicativeRates.map((r) => {
                  const isEditing = editingRateId === r.id;

                  return (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="py-3 px-3 uppercase text-[10px] font-bold text-slate-500">
                        {r.category.replace('_', ' ')}
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-900">
                        {r.name}
                      </td>
                      
                      {isEditing ? (
                        <>
                          <td className="py-3 px-3 text-right">
                            <input
                              type="number"
                              value={editMin}
                              onChange={(e) => setEditMin(parseFloat(e.target.value) || 0)}
                              className="w-20 text-right p-1 rounded border border-forest-600 font-mono font-bold"
                            />
                          </td>
                          <td className="py-3 px-3 text-right">
                            <input
                              type="number"
                              value={editMax}
                              onChange={(e) => setEditMax(parseFloat(e.target.value) || 0)}
                              className="w-20 text-right p-1 rounded border border-forest-600 font-mono font-bold"
                            />
                          </td>
                          <td className="py-3 px-3 text-slate-500">{r.marketSource}</td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => handleSaveRate(r.id)}
                              className="px-2.5 py-1 rounded bg-forest-800 text-white font-bold text-[11px]"
                            >
                              Save
                            </button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-800">
                            ₹{r.minPrice}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-forest-900">
                            ₹{r.maxPrice}
                          </td>
                          <td className="py-3 px-3 text-slate-500 truncate max-w-[200px]">
                            {r.marketSource}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => handleStartEdit(r)}
                              className="p-1 rounded text-slate-500 hover:text-forest-800 hover:bg-slate-100"
                              title="Edit rate range"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Section 3: Disputes Desk */}
      {activeSection === 'disputes' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-soft space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-slate-900">
              Customer Grievances & Scale Dispute Arbitration
            </h3>
            <span className="text-xs text-slate-400">Ensuring fair weighment and mutual trust</span>
          </div>

          <div className="space-y-3">
            {complaints.map((c) => (
              <div
                key={c.id}
                className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">Ticket #{c.id}</span>
                    <span className="text-slate-500">• Order Ref: {c.orderId}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 capitalize">
                      {c.status}
                    </span>
                  </div>
                  <span className="text-slate-400 text-[11px]">{new Date(c.createdAt).toLocaleDateString()}</span>
                </div>

                <div className="text-slate-800 font-semibold">
                  Issue: {c.reason} (Reported by {c.reportedByName} [{c.reportedRole}])
                </div>

                <p className="text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200/70">
                  "{c.details}"
                </p>

                {c.status !== 'resolved' ? (
                  <div className="space-y-2 pt-1">
                    <label className="block">
                      <span className="mb-1 block text-[11px] font-semibold text-slate-600">Resolution notes</span>
                      <textarea
                        value={resolutionDrafts[c.id] || ''}
                        onChange={(event) => setResolutionDrafts((drafts) => ({ ...drafts, [c.id]: event.target.value }))}
                        maxLength={3000}
                        required
                        className="w-full rounded-xl border border-slate-200 p-2.5 text-xs"
                        placeholder="Record the investigation outcome and actions taken."
                      />
                    </label>
                    <div className="flex justify-end gap-2">
                    <button
                      onClick={() => void handleResolveComplaint(c.id)}
                      className="px-3 py-1.5 rounded-xl bg-forest-800 hover:bg-forest-900 text-white font-bold text-xs"
                    >
                      Save Resolution
                    </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-emerald-700 font-medium text-[11px]">
                    ✓ Resolution: {c.resolutionNotes}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
