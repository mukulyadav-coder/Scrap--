import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { MaterialCategory, ListingCondition } from '../../types';
import { 
  UploadCloud, 
  MapPin, 
  Calendar, 
  Clock, 
  Check, 
  AlertTriangle, 
  Info, 
  Sparkles, 
  FileText, 
  ShieldCheck,
  Scale
} from 'lucide-react';

export const SellWasteForm: React.FC = () => {
  const { createListing, uploadImage, currentUser, indicativeRates, language, t, setActiveTab } = useApp();

  const [category, setCategory] = useState<MaterialCategory>('paper');
  const [subcategory, setSubcategory] = useState<string>('Newspaper & Books');
  const [estimatedWeightKg, setEstimatedWeightKg] = useState<number>(20);
  const [condition, setCondition] = useState<ListingCondition>('clean_sorted');
  const [locality, setLocality] = useState<string>(currentUser.locality);
  const [address, setAddress] = useState<string>('');
  const [preferredSlot, setPreferredSlot] = useState<string>('Today, 4:00 PM - 6:00 PM');
  const [notes, setNotes] = useState<string>('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [ewasteConfirmed, setEwasteConfirmed] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const categorySuboptions: Record<MaterialCategory, string[]> = {
    paper: ['Newspaper (Raddi)', 'Office White Paper', 'Books & Magazines', 'Shredded Documents'],
    cardboard: ['Corrugated Cartons', 'Brown Packaging Boxes', 'Rigid Food Boxes'],
    plastic: ['PET Bottles', 'Hard Plastics (Buckets/Chairs)', 'Polythene & Bags', 'PVC Scrap'],
    metal: ['Iron & Steel (Loha)', 'Copper Wire & Cables', 'Brass Utensils (Peetal)', 'Aluminium Profiles & Cans'],
    e_waste: ['Computers & Laptops', 'Mobile Phones & Tablets', 'Circuit Boards / PCBs', 'Batteries & Inverters'],
  };

  const handleCategorySelect = (cat: MaterialCategory) => {
    setCategory(cat);
    setSubcategory(categorySuboptions[cat][0]);
    if (cat !== 'e_waste') {
      setEwasteConfirmed(false);
    }
  };

  const activeRate = indicativeRates.find(r => r.category === category);
  const isEwaste = category === 'e_waste';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isEwaste && !ewasteConfirmed) {
      setSubmitError('Please acknowledge the E-Waste regulatory compliance declaration before submitting.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const uploadedPhotos = await Promise.all(selectedFiles.map((file) => uploadImage(file)));
      await createListing({
        category,
        subcategory,
        estimatedWeightKg: Number(estimatedWeightKg),
        condition,
        photos: uploadedPhotos,
        preferredSlot,
        notes,
        isEwaste,
        locality,
        address,
      });
      setSelectedFiles([]);
      setActiveTab('my_listings');
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Could not publish this listing.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-soft">
        <div className="flex items-center gap-2 text-xs font-bold uppercase text-forest-800 tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
          {language === 'hi' ? 'घर बैठे कबाड़ बेचें' : 'Doorstep Scrap Selling Request'}
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
          {t.actions.sellScrapNow}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Select material type, approximate weight, and pickup time. Nearby certified collectors will send you offers.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Step 1: Visual Material Category Cards */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-soft space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              1. {language === 'hi' ? 'कबाड़ की श्रेणी चुनें' : 'Choose Scrap Category'}
            </label>
            <span className="text-[11px] text-slate-400">Required</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
            {(['paper', 'cardboard', 'plastic', 'metal', 'e_waste'] as MaterialCategory[]).map((cat) => {
              const selected = category === cat;
              const isE = cat === 'e_waste';
              return (
                <button
                  type="button"
                  key={cat}
                  onClick={() => handleCategorySelect(cat)}
                  className={`p-3 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
                    selected
                      ? isE 
                        ? 'border-purple-600 bg-purple-50/70 ring-2 ring-purple-600/20' 
                        : 'border-forest-700 bg-mint-50/80 ring-2 ring-forest-700/20 font-bold'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <div className="text-xl mb-1">
                      {cat === 'paper' && '📰'}
                      {cat === 'cardboard' && '📦'}
                      {cat === 'plastic' && '🧴'}
                      {cat === 'metal' && '🔩'}
                      {cat === 'e_waste' && '💻'}
                    </div>
                    <div className="text-xs font-bold capitalize text-slate-900 leading-tight">
                      {t.categories[cat]}
                    </div>
                  </div>

                  {isE && (
                    <span className="inline-block mt-2 px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-800">
                      Certified
                    </span>
                  )}

                  {selected && (
                    <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-forest-800 text-white flex items-center justify-center">
                      <Check className="w-2.5 h-2.5" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Subcategory Pill Selector */}
          <div className="space-y-2 pt-2">
            <span className="text-xs font-semibold text-slate-600">
              {language === 'hi' ? 'विशिष्ट प्रकार' : 'Specific Item Type'}:
            </span>
            <div className="flex flex-wrap gap-2">
              {categorySuboptions[category].map((sub) => (
                <button
                  type="button"
                  key={sub}
                  onClick={() => setSubcategory(sub)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                    subcategory === sub
                      ? 'bg-forest-800 text-white font-bold'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>
          </div>

          {/* Indicative Rate Reference for this Category */}
          {activeRate && (
            <div className="p-3.5 rounded-2xl bg-forest-50/80 border border-forest-100 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <span className="text-slate-500">Mandi Benchmark Reference:</span>
                  <div className="font-bold text-forest-900">
                    ₹{activeRate.minPrice} – ₹{activeRate.maxPrice} / kg
                  </div>
                </div>
              </div>
              <span className="text-[10px] text-slate-500 italic max-w-[150px] text-right">
                Estimates only; mutually agreed upon pickup
              </span>
            </div>
          )}

          {/* Special E-Waste Compliance Notice */}
          {isEwaste && (
            <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 space-y-3">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="w-5 h-5 text-purple-700 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <h4 className="font-bold text-purple-950">
                    Regulated E-Waste Handling Workflow
                  </h4>
                  <p className="text-purple-800 mt-0.5 leading-relaxed">
                    Under the <em>E-Waste (Management) Rules 2022</em>, electronic equipment is not sent to landfills. It will be dispatched exclusively to Pollution Control Board authorized dismantling hubs.
                  </p>
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold text-purple-900 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={ewasteConfirmed}
                  onChange={(e) => setEwasteConfirmed(e.target.checked)}
                  className="rounded border-purple-300 text-purple-700 focus:ring-purple-500 w-4 h-4"
                />
                <span>I confirm this electronic waste will be transferred to a verified recycler.</span>
              </label>
            </div>
          )}
        </div>

        {/* Step 2: Estimated Weight and Condition */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-soft space-y-5">
          <label className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
            2. {language === 'hi' ? 'अनुमानित वजन और स्थिति' : 'Estimated Weight & Condition'}
          </label>

          {/* Weight slider & number input */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-600 font-medium">Approximate Quantity:</span>
              <div className="text-xl font-black font-mono text-forest-900">
                {estimatedWeightKg} <span className="text-xs font-normal text-slate-500">kg</span>
              </div>
            </div>

            <input
              type="range"
              min="2"
              max="200"
              step="1"
              value={estimatedWeightKg}
              onChange={(e) => setEstimatedWeightKg(Number(e.target.value))}
              className="w-full accent-forest-700 h-2 bg-slate-200 rounded-lg cursor-pointer"
            />

            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>2 kg (Bag)</span>
              <span>25 kg (Medium bundle)</span>
              <span>50 kg (Carton lot)</span>
              <span>150+ kg (Bulk)</span>
            </div>
          </div>

          {/* Condition Selector */}
          <div className="space-y-2">
            <span className="text-xs text-slate-600 font-medium">Material Segregation:</span>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {[
                { id: 'clean_sorted', label: 'Clean & Sorted', desc: 'Higher rate' },
                { id: 'mixed', label: 'Mixed Dry', desc: 'Standard rate' },
                { id: 'unsegregated', label: 'Unsegregated', desc: 'Base rate' },
              ].map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => setCondition(c.id as ListingCondition)}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    condition === c.id
                      ? 'border-forest-700 bg-mint-50 text-forest-950 font-bold'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div>{c.label}</div>
                  <div className="text-[10px] text-slate-400 font-normal">{c.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Step 3: Photos */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-soft space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              3. {language === 'hi' ? 'तस्वीरें (Photos)' : 'Scrap Photos'}
            </label>
            <span className="text-[11px] text-emerald-700 font-medium">Helps collectors give accurate quotes</span>
          </div>

          <label className="flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 p-4 text-sm text-slate-600 hover:border-forest-500 hover:bg-forest-50/50">
            <UploadCloud className="h-5 w-5 text-forest-700" />
            <span>Select up to 8 image files (JPEG, PNG, or WebP; 5 MB each).</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="sr-only"
              onChange={(event) => {
                const files = Array.from(event.currentTarget.files || []);
                event.currentTarget.value = '';
                if (files.length > 8) {
                  setSubmitError('Choose no more than 8 images.');
                  return;
                }
                if (files.some((file) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024)) {
                  setSubmitError('Each image must be JPEG, PNG, or WebP and no larger than 5 MB.');
                  return;
                }
                setSubmitError(null);
                setSelectedFiles(files);
              }}
            />
          </label>
          {selectedFiles.length > 0 && (
            <ul className="space-y-1 text-xs text-slate-600" aria-label="Selected listing photos">
              {selectedFiles.map((file) => <li key={`${file.name}-${file.lastModified}`}>{file.name}</li>)}
            </ul>
          )}
        </div>

        {/* Step 4: Locality, Address and Preferred Slot */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-soft space-y-4">
          <label className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
            4. {language === 'hi' ? 'पता एवं पिकअप समय' : 'Pickup Location & Time Slot'}
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-600">
                Locality / Area
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={locality}
                  onChange={(e) => setLocality(e.target.value)}
                  required
                  placeholder="e.g. Green Park, New Delhi"
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-forest-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-600">
                Preferred Time Slot
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={preferredSlot}
                  onChange={(e) => setPreferredSlot(e.target.value)}
                  required
                  placeholder="e.g. Today 4:00 PM - 6:00 PM"
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-forest-500"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-600">
              Detailed Address / Landmark
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
              placeholder="House/Office number, street, landmark"
              className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-forest-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-600">
              Special Instructions (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Bundled with twine, lift available, ground floor parking"
              className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-forest-500"
            />
          </div>
        </div>

        {/* Submit Button */}
        {submitError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{submitError}</p>}
        <button
          type="submit"
          disabled={isSubmitting || (isEwaste && !ewasteConfirmed)}
          className="w-full py-4 px-6 rounded-2xl bg-forest-800 hover:bg-forest-900 text-white font-bold text-sm sm:text-base shadow-lg shadow-forest-900/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
        >
          <Sparkles className="w-5 h-5 text-emerald-400" />
          <span>{isSubmitting ? 'Publishing Request...' : 'Publish Scrap Request & Request Offers'}</span>
        </button>

      </form>

    </div>
  );
};
