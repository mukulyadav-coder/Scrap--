import React, { useState, useEffect } from 'react';
import { useApp } from './context/AppContext';
import { Header } from './components/common/Header';
import { Sidebar, BottomNav } from './components/common/Navigation';
import { Toast } from './components/common/Toast';
import { ReceiptModal } from './components/modals/ReceiptModal';
import { WeighingModal } from './components/modals/WeighingModal';
import { SubmitOfferModal } from './components/modals/SubmitOfferModal';
import { IndicativeRateBoard } from './components/common/IndicativeRateBoard';
import { LoginPage } from './components/auth/LoginPage';
import { useAuth } from './context/AuthContext';
import { toDashboardRole } from './services/auth';

// Seller views
import { SellerDashboard } from './components/seller/SellerDashboard';
import { SellWasteForm } from './components/seller/SellWasteForm';
import { SellerListingsAndOffers } from './components/seller/SellerListingsAndOffers';
import { SellerOrdersTracking } from './components/seller/SellerOrdersTracking';

// Kabadiwala views
import { KabadiwalaDashboard } from './components/kabadiwala/KabadiwalaDashboard';
import { KabadiwalaFeed } from './components/kabadiwala/KabadiwalaFeed';
import { KabadiwalaPickups } from './components/kabadiwala/KabadiwalaPickups';
import { KabadiwalaInventory } from './components/kabadiwala/KabadiwalaInventory';
import { KabadiwalaBulkMarket } from './components/kabadiwala/KabadiwalaBulkMarket';

// Bulk buyer views
import { BulkBuyerDashboard } from './components/bulk/BulkBuyerDashboard';

// Admin views
import { AdminDashboard } from './components/admin/AdminDashboard';

import { Order, WasteListing } from './types';

export const MainApp: React.FC = () => {
  const { 
    role, 
    setRole,
    activeTab, 
    selectedReceiptOrder, 
    setSelectedReceiptOrder, 
  } = useApp();
  const { status: authStatus, user } = useAuth();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [weighingOrder, setWeighingOrder] = useState<Order | null>(null);
  const [offerListing, setOfferListing] = useState<WasteListing | null>(null);

  useEffect(() => {
    if (authStatus === 'authenticated' && user && role !== toDashboardRole(user.role)) {
      setRole(toDashboardRole(user.role));
    }
  }, [authStatus, user, role, setRole]);

  if (authStatus === 'loading') {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50" aria-live="polite">
        <div className="flex items-center gap-3 text-sm font-medium text-teal-900">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-teal-700 border-t-transparent" />
          Restoring your ScrapSetu session…
        </div>
      </main>
    );
  }

  if (authStatus !== 'authenticated' || !user) {
    return <LoginPage />;
  }

  const expectedRole = toDashboardRole(user.role);
  if (role !== expectedRole) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50" aria-live="polite">
        <div className="flex items-center gap-3 text-sm font-medium text-teal-900">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-teal-700 border-t-transparent" />
          Loading your dashboard…
        </div>
      </main>
    );
  }

  // Render role-specific screen
  const renderScreen = () => {
    // Shared rate screen
    if (activeTab === 'rates') {
      return <IndicativeRateBoard />;
    }

    if (role === 'seller') {
      switch (activeTab) {
        case 'dashboard':
          return <SellerDashboard />;
        case 'sell_waste':
          return <SellWasteForm />;
        case 'my_listings':
          return <SellerListingsAndOffers />;
        case 'orders':
        case 'receipts':
          return <SellerOrdersTracking />;
        default:
          return <SellerDashboard />;
      }
    }

    if (role === 'kabadiwala') {
      switch (activeTab) {
        case 'dashboard':
          return <KabadiwalaDashboard onOpenWeighing={(ord) => setWeighingOrder(ord)} />;
        case 'feed':
          return <KabadiwalaFeed onOpenOfferModal={(list) => setOfferListing(list)} />;
        case 'orders':
        case 'receipts':
          return <KabadiwalaPickups onOpenWeighing={(ord) => setWeighingOrder(ord)} />;
        case 'inventory':
          return <KabadiwalaInventory />;
        case 'bulk_market':
          return <KabadiwalaBulkMarket />;
        default:
          return <KabadiwalaDashboard onOpenWeighing={(ord) => setWeighingOrder(ord)} />;
      }
    }

    if (role === 'bulk_buyer') {
      switch (activeTab) {
        case 'dashboard':
        case 'published_rates':
          return <BulkBuyerDashboard />;
        case 'feed':
          return <KabadiwalaFeed onOpenOfferModal={(list) => setOfferListing(list)} />;
        case 'procurement':
        case 'bulk_market':
          return <KabadiwalaBulkMarket />;
        case 'orders':
        case 'receipts':
          return <KabadiwalaPickups onOpenWeighing={(ord) => setWeighingOrder(ord)} />;
        default:
          return <BulkBuyerDashboard />;
      }
    }

    if (role === 'admin') {
      return <AdminDashboard />;
    }

    return <SellerDashboard />;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* Top Navigation Bar */}
      <Header 
        onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)} 
        isSidebarOpen={isSidebarOpen} 
      />

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Desktop Sidebar Navigation */}
        <Sidebar 
          isOpen={isSidebarOpen} 
          onClose={() => setIsSidebarOpen(false)} 
        />

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 lg:ml-64 pb-24 lg:pb-12 min-w-0">
          {renderScreen()}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav />

      {/* Global Modals */}
      <ReceiptModal
        order={selectedReceiptOrder}
        onClose={() => setSelectedReceiptOrder(null)}
      />

      <WeighingModal
        order={weighingOrder}
        onClose={() => setWeighingOrder(null)}
      />

      <SubmitOfferModal
        listing={offerListing}
        onClose={() => setOfferListing(null)}
      />

      {/* Toast Alert Notifications */}
      <Toast />

    </div>
  );
};

export default function App() {
  return <MainApp />;
}
