import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  UserRole, 
  Language, 
  User, 
  WasteListing, 
  Offer, 
  Order, 
  IndicativeRate, 
  BulkRequirement, 
  InventoryItem, 
  VerificationRequest, 
  Complaint,
  OrderStatus,
  PaymentStatus,
  MaterialCategory,
  ListingCondition
} from '../types';
import { translations, getTranslation } from '../utils/translations';
import { useAuth } from './AuthContext';
import { toDashboardRole } from '../services/auth';
import { api, resolveMediaUrl } from '../services/api';

interface AppContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  currentUser: User;
  t: typeof translations.en;
  
  // Navigation / active view
  activeTab: string;
  setActiveTab: (tab: string) => void;

  // Data collections
  listings: WasteListing[];
  offers: Offer[];
  orders: Order[];
  indicativeRates: IndicativeRate[];
  inventory: InventoryItem[];
  bulkRequirements: BulkRequirement[];
  verificationRequests: VerificationRequest[];
  complaints: Complaint[];

  // Notification / toast message
  toast: { message: string; type: 'success' | 'info' | 'error' } | null;
  showToast: (message: string, type?: 'success' | 'info' | 'error') => void;

  // Selected order for receipt viewing/printing
  selectedReceiptOrder: Order | null;
  setSelectedReceiptOrder: (order: Order | null) => void;

  // Core Transactional Actions
  createListing: (data: {
    category: MaterialCategory;
    subcategory: string;
    estimatedWeightKg: number;
    condition: ListingCondition;
    photos: string[];
    preferredSlot: string;
    notes?: string;
    isEwaste: boolean;
    locality: string;
    address: string;
  }) => Promise<WasteListing>;

  submitOffer: (data: {
    listingId: string;
    offeredRatePerKg: number;
    proposedPickupTime: string;
    note?: string;
  }) => Promise<Offer>;

  acceptOffer: (listingId: string, offerId: string) => Promise<Order>;
  
  recordWeighingAndSettle: (params: {
    orderId: string;
    actualWeightKg: number;
    paymentStatus: PaymentStatus;
    transactionNotes?: string;
  }) => Promise<Order>;

  publishBulkRequirement: (req: Omit<BulkRequirement, 'id' | 'buyerId' | 'buyerName' | 'companyName'>) => Promise<BulkRequirement>;
  
  updateIndicativeRate: (rateId: string, minPrice: number, maxPrice: number) => Promise<void>;
  
  reviewVerification: (id: string, status: 'approved' | 'rejected') => Promise<void>;
  
  resolveComplaint: (id: string, notes: string) => Promise<void>;
  uploadImage: (file: File) => Promise<string>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_PREFIX = 'scrapsetu_';

const text = (value: unknown): string => typeof value === 'string' ? value : '';
const number = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const listingStatus = (value: unknown): OrderStatus => {
  switch (text(value).toLowerCase()) {
    case 'active':
    case 'pending': return 'pending';
    case 'reserved':
    case 'accepted':
    case 'confirmed': return 'accepted';
    case 'sold':
    case 'completed': return 'completed';
    case 'cancelled': return 'cancelled';
    default: return 'pending';
  }
};

const mapListing = (row: Record<string, unknown>): WasteListing => ({
  id: text(row.id),
  sellerId: text(row.seller_id),
  sellerName: text(row.seller_name),
  sellerPhone: text(row.seller_phone),
  locality: text(row.locality),
  address: text(row.pickup_address),
  category: text(row.material_category) as MaterialCategory,
  subcategory: text(row.subcategory),
  estimatedWeightKg: number(row.estimated_weight_kg),
  condition: text(row.condition) as ListingCondition,
  photos: Array.isArray(row.photos) ? row.photos.map(text).filter(Boolean).map(resolveMediaUrl) : [],
  preferredSlot: text(row.preferred_slot),
  notes: text(row.notes) || undefined,
  status: listingStatus(row.status),
  createdAt: text(row.created_at),
  isEwaste: row.is_ewaste === true || text(row.is_ewaste).toLowerCase() === 'true',
  ewasteComplianceAccepted: row.ewaste_compliance_accepted === true || text(row.ewaste_compliance_accepted).toLowerCase() === 'true',
  offersCount: number(row.offers_count),
  acceptedOfferId: text(row.accepted_offer_id) || undefined,
});

const mapOffer = (row: Record<string, unknown>): Offer => ({
  id: text(row.id),
  listingId: text(row.listing_id),
  buyerId: text(row.buyer_id),
  buyerName: text(row.buyer_name),
  buyerRole: text(row.buyer_role).toUpperCase() === 'BUYER' || text(row.buyer_role).toUpperCase() === 'RECYCLER' ? 'bulk_buyer' : 'kabadiwala',
  buyerRating: number(row.buyer_rating),
  buyerDistanceKm: number(row.buyer_distance_km),
  offeredRatePerKg: number(row.offered_rate_per_kg),
  totalEstimatedAmount: number(row.total_estimated_amount),
  proposedPickupTime: text(row.proposed_pickup_time),
  note: text(row.note) || undefined,
  status: text(row.status).toLowerCase() as Offer['status'],
  createdAt: text(row.created_at),
});

const mapOrder = (row: Record<string, unknown>): Order => ({
  id: text(row.id),
  listingId: text(row.listing_id),
  sellerId: text(row.seller_id),
  sellerName: text(row.seller_name),
  sellerPhone: text(row.seller_phone),
  sellerAddress: text(row.seller_address),
  buyerId: text(row.buyer_id),
  buyerName: text(row.buyer_name),
  buyerPhone: text(row.buyer_phone),
  category: text(row.category) as MaterialCategory,
  subcategory: text(row.subcategory),
  agreedRatePerKg: number(row.agreed_rate_per_kg),
  actualWeightKg: number(row.actual_weight_kg) || undefined,
  finalAmount: number(row.final_amount) || undefined,
  status: text(row.status).toLowerCase() === 'confirmed' ? 'pickup_scheduled' : text(row.status).toLowerCase() as OrderStatus,
  paymentStatus: text(row.payment_status).toLowerCase() as PaymentStatus,
  scheduledSlot: text(row.scheduled_slot),
  scheduledDate: text(row.scheduled_date),
  completedAt: text(row.completed_at) || undefined,
  transactionNotes: text(row.notes) || undefined,
  receiptNumber: text(row.receipt_number),
  createdAt: text(row.created_at),
});

const mapRate = (row: Record<string, unknown>): IndicativeRate => ({
  id: text(row.id),
  category: text(row.category) as MaterialCategory,
  name: text(row.name),
  hindiName: text(row.hindi_name),
  minPrice: number(row.min_price),
  maxPrice: number(row.max_price),
  unit: text(row.unit) || '₹ / kg',
  lastUpdated: text(row.last_updated),
  marketSource: text(row.market_source),
  trend: text(row.trend) === 'up' || text(row.trend) === 'down' ? text(row.trend) as 'up' | 'down' : 'stable',
  description: text(row.description),
  isRegulated: row.is_regulated === true || text(row.is_regulated).toLowerCase() === 'true',
});

const mapBulkRequirement = (row: Record<string, unknown>): BulkRequirement => ({
  id: text(row.id),
  buyerId: text(row.buyer_id),
  buyerName: text(row.buyer_name),
  companyName: text(row.company_name),
  category: text(row.category) as MaterialCategory,
  subcategory: text(row.subcategory),
  minQuantityKg: number(row.min_quantity_kg),
  offeredRatePerKg: number(row.offered_rate_per_kg),
  purityGrade: text(row.purity_grade),
  locality: text(row.locality),
  validTill: text(row.valid_till),
  notes: text(row.notes) || undefined,
});

const mapVerification = (row: Record<string, unknown>): VerificationRequest => ({
  id: text(row.id),
  userId: text(row.user_id),
  userName: text(row.user_name),
  role: text(row.role).toLowerCase() === 'collector' ? 'kabadiwala' : text(row.role).toLowerCase() === 'buyer' || text(row.role).toLowerCase() === 'recycler' ? 'bulk_buyer' : 'seller',
  businessName: text(row.business_name),
  idType: text(row.document_type) as VerificationRequest['idType'],
  idNumber: text(row.document_reference),
  documentUrl: text(row.file_path) ? resolveMediaUrl(text(row.file_path)) : '',
  status: text(row.verification_status).toLowerCase() as VerificationRequest['status'],
  submittedAt: text(row.created_at),
  notes: text(row.notes) || undefined,
});

const mapComplaint = (row: Record<string, unknown>): Complaint => ({
  id: text(row.id),
  orderId: text(row.order_id),
  reportedByUserId: text(row.reported_by_user_id),
  reportedByName: text(row.reported_by_name),
  reportedRole: text(row.reported_role).toLowerCase() === 'collector' ? 'kabadiwala' : text(row.reported_role).toLowerCase() === 'buyer' || text(row.reported_role).toLowerCase() === 'recycler' ? 'bulk_buyer' : 'seller',
  reason: text(row.reason),
  details: text(row.details),
  status: text(row.status).toLowerCase() as Complaint['status'],
  createdAt: text(row.created_at),
  resolutionNotes: text(row.resolution_notes) || undefined,
});

const mapInventory = (rows: Record<string, unknown>[]): InventoryItem[] => {
  const grouped = new Map<string, InventoryItem>();
  for (const row of rows) {
    const category = text(row.material_category) as MaterialCategory;
    const current = grouped.get(category);
    const weight = number(row.weight_kg);
    const cost = number(row.asking_price);
    if (current) {
      const combinedWeight = current.currentStockKg + weight;
      current.avgPurchaseCostPerKg = combinedWeight
        ? (current.avgPurchaseCostPerKg * current.currentStockKg + cost * weight) / combinedWeight
        : 0;
      current.currentStockKg = combinedWeight;
    } else {
      grouped.set(category, {
        id: text(row.id),
        category,
        subcategory: text(row.subcategory),
        currentStockKg: weight,
        avgPurchaseCostPerKg: cost,
        lastUpdated: text(row.updated_at).slice(0, 10),
      });
    }
  }
  return [...grouped.values()];
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { status: authStatus, user: authUser, accessToken } = useAuth();
  const role: UserRole = authUser ? toDashboardRole(authUser.role) : 'seller';

  // Load language
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem(`${STORAGE_PREFIX}lang`);
    return (saved as Language) || 'en';
  });

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState<Order | null>(null);

  const [listings, setListings] = useState<WasteListing[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [indicativeRates, setIndicativeRates] = useState<IndicativeRate[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [bulkRequirements, setBulkRequirements] = useState<BulkRequirement[]>([]);
  const [verificationRequests, setVerificationRequests] = useState<VerificationRequest[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);

  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_PREFIX}lang`, language);
    } catch {
      // Keep the current language in memory if browser storage is unavailable.
    }
  }, [language]);

  // Toast handler
  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  useEffect(() => {
    if (authStatus !== 'authenticated' || !accessToken || !authUser) {
      setListings([]);
      setOffers([]);
      setOrders([]);
      setIndicativeRates([]);
      setInventory([]);
      setBulkRequirements([]);
      setVerificationRequests([]);
      setComplaints([]);
      return;
    }

    let cancelled = false;
    const load = async () => {
      const requests = [
        api.getListings(accessToken, { mine: authUser.role === 'SELLER' }),
        api.getOffers(accessToken),
        api.getOrders(accessToken),
        api.getRates(accessToken),
        api.getBulkRequirements(accessToken),
        api.getVerifications(accessToken),
        ...(authUser.role === 'COLLECTOR' || authUser.role === 'ADMIN' ? [api.getInventory(accessToken)] : []),
        ...(authUser.role === 'ADMIN' ? [api.getComplaints(accessToken)] : []),
      ];
      const results = await Promise.allSettled(requests);
      if (cancelled) return;

      const assignRows = (
        result: PromiseSettledResult<Record<string, unknown>[]>,
        setter: (value: Record<string, unknown>[]) => void,
        name: string,
      ) => {
        if (result.status === 'fulfilled') setter(result.value);
        else showToast(result.reason instanceof Error ? result.reason.message : `Could not load ${name}.`, 'error');
      };
      let index = 0;
      const listingRows = results[index++];
      assignRows(listingRows, (rows) => setListings(rows.map(mapListing)), 'listings');
      const offerRows = results[index++];
      assignRows(offerRows, (rows) => setOffers(rows.map(mapOffer)), 'offers');
      const orderRows = results[index++];
      assignRows(orderRows, (rows) => setOrders(rows.map(mapOrder)), 'orders');
      const rateRows = results[index++];
      assignRows(rateRows, (rows) => setIndicativeRates(rows.map(mapRate)), 'rates');
      const bulkRows = results[index++];
      assignRows(bulkRows, (rows) => setBulkRequirements(rows.map(mapBulkRequirement)), 'bulk requirements');
      const verificationRows = results[index++];
      assignRows(verificationRows, (rows) => setVerificationRequests(rows.map(mapVerification)), 'verifications');
      if (authUser.role === 'COLLECTOR' || authUser.role === 'ADMIN') {
        const inventoryRows = results[index++];
        assignRows(inventoryRows, (rows) => setInventory(mapInventory(rows)), 'inventory');
      }
      if (authUser.role === 'ADMIN') {
        const complaintRows = results[index];
        assignRows(complaintRows, (rows) => setComplaints(rows.map(mapComplaint)), 'complaints');
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [authStatus, accessToken, authUser]);

  const currentUser: User = authUser ? {
    id: authUser.id,
    name: authUser.full_name,
    phone: authUser.phone,
    email: authUser.email,
    role: toDashboardRole(authUser.role),
    locality: authUser.locality || '',
    address: [authUser.locality, authUser.city].filter(Boolean).join(', '),
    isVerified: authUser.verification_status === 'VERIFIED',
    greenScoreKg: number(authUser.green_score_kg),
    totalEarningsOrSpend: 0,
    businessName: authUser.business_name || undefined,
    completedPickups: number(authUser.completed_transactions),
  } : {
    id: '',
    name: '',
    phone: '',
    role,
    locality: '',
    address: '',
    isVerified: false,
    greenScoreKg: 0,
    totalEarningsOrSpend: 0,
  };
  const t = getTranslation(language);

  const setRole = (newRole: UserRole) => {
    if (newRole !== (authUser ? toDashboardRole(authUser.role) : role)) {
      showToast('Your account role controls which dashboard is available.', 'error');
      return;
    }
    setActiveTab('dashboard');
  };

  const setLanguage = (newLang: Language) => {
    setLanguageState(newLang);
    showToast(newLang === 'hi' ? 'भाषा बदलकर हिन्दी की गई' : 'Language changed to English', 'info');
  };

  const requireToken = (): string => {
    if (!accessToken || authStatus !== 'authenticated') {
      throw new Error('Sign in to perform this action.');
    }
    return accessToken;
  };

  const refreshListings = async (token: string) => setListings(
    (await api.getListings(token, { mine: authUser?.role === 'SELLER' })).map(mapListing),
  );
  const refreshOffers = async (token: string) => setOffers((await api.getOffers(token)).map(mapOffer));
  const refreshOrders = async (token: string) => setOrders((await api.getOrders(token)).map(mapOrder));
  const refreshInventory = async (token: string) => setInventory(mapInventory(await api.getInventory(token)));

  const createListing = async (data: {
    category: MaterialCategory;
    subcategory: string;
    estimatedWeightKg: number;
    condition: ListingCondition;
    photos: string[];
    preferredSlot: string;
    notes?: string;
    isEwaste: boolean;
    locality: string;
    address: string;
  }): Promise<WasteListing> => {
    const token = requireToken();
    const row = await api.createListing(token, {
      title: data.subcategory,
      material_category: data.category,
      subcategory: data.subcategory,
      description: data.notes || '',
      condition: data.condition,
      quantity: data.estimatedWeightKg,
      unit: 'kg',
      estimated_weight_kg: data.estimatedWeightKg,
      image_paths: data.photos,
      pickup_address: data.address || currentUser.address,
      city: authUser?.city || '',
      locality: data.locality || currentUser.locality,
      is_ewaste: data.isEwaste,
      ewaste_compliance_accepted: data.isEwaste,
      notes: data.notes || '',
      preferred_slot: data.preferredSlot,
    });
    const newListing = mapListing(row);
    await refreshListings(token);
    showToast('Listing published! Nearby collectors have been notified.', 'success');
    return newListing;
  };

  const submitOffer = async (data: {
    listingId: string;
    offeredRatePerKg: number;
    proposedPickupTime: string;
    note?: string;
  }): Promise<Offer> => {
    const token = requireToken();
    const row = await api.createOffer(token, {
      listing_id: data.listingId,
      offered_rate_per_kg: data.offeredRatePerKg,
      proposed_pickup_time: data.proposedPickupTime,
      note: data.note || '',
    });
    const newOffer = mapOffer(row);
    await Promise.all([refreshOffers(token), refreshListings(token)]);
    showToast(`Offer of ₹${data.offeredRatePerKg}/kg submitted to seller!`, 'success');
    return newOffer;
  };

  const acceptOffer = async (_listingId: string, offerId: string): Promise<Order> => {
    const token = requireToken();
    const row = await api.acceptOffer(token, offerId);
    const newOrder = mapOrder(row);
    await Promise.all([refreshOffers(token), refreshListings(token), refreshOrders(token)]);
    showToast('Offer accepted and pickup scheduled.', 'success');
    return newOrder;
  };

  const recordWeighingAndSettle = async (params: {
    orderId: string;
    actualWeightKg: number;
    paymentStatus: PaymentStatus;
    transactionNotes?: string;
  }): Promise<Order> => {
    const token = requireToken();
    const row = await api.settleOrder(token, params.orderId, {
      actual_weight_kg: params.actualWeightKg,
      payment_status: params.paymentStatus,
      transaction_notes: params.transactionNotes || '',
    });
    const updatedOrder = mapOrder(row);
    await Promise.all([refreshOrders(token), refreshListings(token), refreshInventory(token)]);
    setSelectedReceiptOrder(updatedOrder);
    showToast(`Order settled! ₹${updatedOrder.finalAmount || 0} recorded. Digital receipt generated.`, 'success');
    return updatedOrder;
  };

  const publishBulkRequirement = async (req: Omit<BulkRequirement, 'id' | 'buyerId' | 'buyerName' | 'companyName'>): Promise<BulkRequirement> => {
    const token = requireToken();
    const row = await api.createBulkRequirement(token, {
      category: req.category,
      subcategory: req.subcategory,
      min_quantity_kg: req.minQuantityKg,
      offered_rate_per_kg: req.offeredRatePerKg,
      purity_grade: req.purityGrade,
      locality: req.locality,
      valid_till: req.validTill,
      notes: req.notes || '',
    });
    const newReq = mapBulkRequirement(row);
    setBulkRequirements((items) => [newReq, ...items]);
    showToast('Bulk procurement requirement published to regional collectors!', 'success');
    return newReq;
  };

  const updateIndicativeRate = async (rateId: string, minPrice: number, maxPrice: number): Promise<void> => {
    const token = requireToken();
    const row = await api.updateRate(token, rateId, { min_price: minPrice, max_price: maxPrice });
    setIndicativeRates((items) => items.map((rate) => rate.id === rateId ? mapRate(row) : rate));
    showToast('Mandi benchmark rate card updated platform-wide.', 'success');
  };

  const reviewVerification = async (id: string, status: 'approved' | 'rejected'): Promise<void> => {
    const token = requireToken();
    const row = await api.reviewVerification(token, id, status.toUpperCase());
    setVerificationRequests((items) => items.map((request) => request.id === id ? mapVerification(row) : request));
    showToast(`Verification request marked as ${status.toUpperCase()}.`, status === 'approved' ? 'success' : 'info');
  };

  const resolveComplaint = async (id: string, notes: string): Promise<void> => {
    const token = requireToken();
    const row = await api.resolveComplaint(token, id, 'RESOLVED', notes);
    setComplaints((items) => items.map((complaint) => complaint.id === id ? mapComplaint(row) : complaint));
    showToast('Grievance resolved and archived in compliance log.', 'success');
  };

  const uploadImage = (file: File): Promise<string> => api.uploadImage(requireToken(), file);

  return (
    <AppContext.Provider value={{
      role,
      setRole,
      language,
      setLanguage,
      currentUser,
      t,
      activeTab,
      setActiveTab,
      listings,
      offers,
      orders,
      indicativeRates,
      inventory,
      bulkRequirements,
      verificationRequests,
      complaints,
      toast,
      showToast,
      selectedReceiptOrder,
      setSelectedReceiptOrder,
      createListing,
      submitOffer,
      acceptOffer,
      recordWeighingAndSettle,
      publishBulkRequirement,
      updateIndicativeRate,
      reviewVerification,
      resolveComplaint,
      uploadImage,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
