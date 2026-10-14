import React from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, 
  PlusCircle, 
  ListOrdered, 
  Truck, 
  TrendingUp, 
  Receipt, 
  Radio, 
  Warehouse, 
  Layers, 
  Factory, 
  SlidersHorizontal, 
  ShieldAlert, 
  CheckCheck,
  Sparkles,
  HelpCircle,
  PhoneCall
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string;
}

export const Sidebar: React.FC<{ isOpen?: boolean; onClose?: () => void }> = ({ 
  isOpen = false, 
  onClose 
}) => {
  const { role, activeTab, setActiveTab, language, t, listings, orders, verificationRequests, complaints } = useApp();
  const { user } = useAuth();
  const roleTitle = user?.role === 'RECYCLER'
    ? (language === 'hi' ? 'रीसाइकलर' : 'Recycler')
    : t.roles[role].title;
  const roleDescription = user?.role === 'RECYCLER'
    ? (language === 'hi'
      ? 'प्रोक्योरमेंट मार्केटप्लेस से पुनर्चक्रण योग्य सामग्री प्राप्त करें।'
      : 'Source recyclable materials through the procurement marketplace.')
    : t.roles[role].description;

  // Calculate dynamic badges
  const pendingOffersCount = listings.filter(l => l.status === 'pending' && l.offersCount > 0).length;
  const activeOrdersCount = orders.filter(o => o.status === 'pickup_scheduled').length;
  const pendingKYCCount = verificationRequests.filter(v => v.status === 'pending').length;
  const openDisputesCount = complaints.filter(c => c.status === 'open' || c.status === 'investigating').length;

  const getNavItems = (): NavItem[] => {
    switch (role) {
      case 'seller':
        return [
          { id: 'dashboard', label: t.nav.dashboard, icon: LayoutDashboard },
          { id: 'sell_waste', label: t.nav.sellWaste, icon: PlusCircle },
          { 
            id: 'my_listings', 
            label: t.nav.myListings, 
            icon: ListOrdered, 
            badge: pendingOffersCount > 0 ? pendingOffersCount : undefined 
          },
          { 
            id: 'orders', 
            label: t.nav.orders, 
            icon: Truck, 
            badge: activeOrdersCount > 0 ? activeOrdersCount : undefined 
          },
          { id: 'rates', label: t.nav.rates, icon: TrendingUp },
          { id: 'receipts', label: t.nav.ledger, icon: Receipt },
        ];
      case 'kabadiwala':
        return [
          { id: 'dashboard', label: t.nav.dashboard, icon: LayoutDashboard },
          { 
            id: 'feed', 
            label: t.nav.feed, 
            icon: Radio, 
            badge: listings.filter(l => l.status === 'pending').length 
          },
          { 
            id: 'orders', 
            label: t.nav.orders, 
            icon: Truck, 
            badge: activeOrdersCount > 0 ? activeOrdersCount : undefined 
          },
          { id: 'inventory', label: t.nav.inventory, icon: Warehouse },
          { id: 'bulk_market', label: t.nav.bulkMarket, icon: Layers },
          { id: 'receipts', label: t.nav.ledger, icon: Receipt },
        ];
      case 'bulk_buyer':
        return [
          { id: 'dashboard', label: t.nav.dashboard, icon: LayoutDashboard },
          { id: 'feed', label: language === 'hi' ? 'सामग्री देखें' : 'Available Materials', icon: Radio },
          { id: 'procurement', label: t.nav.procurement, icon: Factory },
          { id: 'published_rates', label: t.nav.publishedRates, icon: SlidersHorizontal },
          { id: 'orders', label: t.nav.orders, icon: Truck },
          { id: 'receipts', label: t.nav.ledger, icon: Receipt },
        ];
      case 'admin':
        return [
          { id: 'dashboard', label: t.nav.dashboard, icon: LayoutDashboard },
          { 
            id: 'users', 
            label: t.nav.users, 
            icon: CheckCheck, 
            badge: pendingKYCCount > 0 ? pendingKYCCount : undefined 
          },
          { id: 'admin_rates', label: t.nav.adminRates, icon: TrendingUp },
          { 
            id: 'disputes', 
            label: t.nav.disputes, 
            icon: ShieldAlert, 
            badge: openDisputesCount > 0 ? openDisputesCount : undefined 
          },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          onClick={onClose} 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden" 
        />
      )}

      {/* Sidebar container */}
      <aside className={`
        fixed top-16 sm:top-18 bottom-0 left-0 w-64 bg-white border-r border-slate-200/80 p-4 z-40
        flex flex-col justify-between transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="space-y-6">
          {/* Active Role Card */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-mint-50 to-white border border-forest-100 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-forest-800">
                {user?.role === 'RECYCLER' ? 'RECYCLER' : t.roles[role].badge}
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <h4 className="text-sm font-bold text-forest-950 mt-1">
              {roleTitle}
            </h4>
            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
              {roleDescription}
            </p>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <div className="text-[10px] font-bold text-slate-400 px-3 py-1 uppercase tracking-wider">
              Navigation
            </div>
            {navItems.map((item) => {
              const active = activeTab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    if (onClose) onClose();
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                    active
                      ? 'bg-forest-800 text-white shadow-sm shadow-forest-900/20 font-bold'
                      : 'text-slate-600 hover:text-forest-900 hover:bg-forest-50/70'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-slate-500'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      active ? 'bg-white text-forest-900' : 'bg-emerald-100 text-forest-800'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Support Card */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <HelpCircle className="w-3.5 h-3.5 text-forest-700" />
            <span>24/7 Helpline & Support</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Assistance for scrap pickups, weigh scale disputes or partner onboarding.
          </p>
          <a
            href="tel:18001234567"
            className="flex items-center justify-center gap-1.5 w-full py-1.5 px-3 rounded-xl bg-white border border-slate-200 text-xs font-bold text-forest-800 hover:bg-forest-50 transition-colors shadow-2xs"
          >
            <PhoneCall className="w-3 h-3 text-emerald-600" />
            1800-SCRAP-CONNECT
          </a>
        </div>
      </aside>
    </>
  );
};

export const BottomNav: React.FC = () => {
  const { role, activeTab, setActiveTab, t } = useApp();

  // Define top 4-5 mobile bottom bar buttons based on role
  const getMobileItems = (): NavItem[] => {
    switch (role) {
      case 'seller':
        return [
          { id: 'dashboard', label: t.nav.dashboard, icon: LayoutDashboard },
          { id: 'sell_waste', label: t.nav.sellWaste, icon: PlusCircle },
          { id: 'my_listings', label: t.nav.myListings, icon: ListOrdered },
          { id: 'orders', label: t.nav.orders, icon: Truck },
          { id: 'rates', label: t.nav.rates, icon: TrendingUp },
        ];
      case 'kabadiwala':
        return [
          { id: 'dashboard', label: t.nav.dashboard, icon: LayoutDashboard },
          { id: 'feed', label: t.nav.feed, icon: Radio },
          { id: 'orders', label: t.nav.orders, icon: Truck },
          { id: 'inventory', label: t.nav.inventory, icon: Warehouse },
          { id: 'bulk_market', label: t.nav.bulkMarket, icon: Layers },
        ];
      case 'bulk_buyer':
        return [
          { id: 'dashboard', label: t.nav.dashboard, icon: LayoutDashboard },
          { id: 'procurement', label: t.nav.procurement, icon: Factory },
          { id: 'published_rates', label: t.nav.publishedRates, icon: SlidersHorizontal },
          { id: 'orders', label: t.nav.orders, icon: Truck },
        ];
      case 'admin':
        return [
          { id: 'dashboard', label: t.nav.dashboard, icon: LayoutDashboard },
          { id: 'users', label: t.nav.users, icon: CheckCheck },
          { id: 'admin_rates', label: t.nav.adminRates, icon: TrendingUp },
          { id: 'disputes', label: t.nav.disputes, icon: ShieldAlert },
        ];
      default:
        return [];
    }
  };

  const mobileItems = getMobileItems();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-2 py-1.5 lg:hidden flex justify-around items-center shadow-lg">
      {mobileItems.map((item) => {
        const active = activeTab === item.id;
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-[10px] font-semibold transition-all ${
              active ? 'text-forest-800 scale-105 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className={`p-1 rounded-lg ${active ? 'bg-forest-100 text-forest-800' : 'text-slate-500'}`}>
              <Icon className="w-4 h-4" />
            </div>
            <span className="mt-0.5 truncate max-w-[64px]">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
