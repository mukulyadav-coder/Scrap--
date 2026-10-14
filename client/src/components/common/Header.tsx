import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { 
  Recycle, 
  Globe, 
  ShieldCheck, 
  Sparkles,
  Menu,
  X,
  LogIn
} from 'lucide-react';

export const Header: React.FC<{ onMenuToggle?: () => void; isSidebarOpen?: boolean }> = ({ 
  onMenuToggle, 
  isSidebarOpen 
}) => {
  const { 
    role, 
    language, 
    setLanguage, 
    currentUser, 
    t,
    showToast,
  } = useApp();

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const { user, logout } = useAuth();
  const displayName = user?.full_name || currentUser.name;
  const displayLocation = [user?.locality, user?.city].filter(Boolean).join(', ');
  const displayBusiness = user?.business_name || displayLocation || currentUser.locality;
  const displayVerified = user ? user.verification_status === 'VERIFIED' : currentUser.isVerified;
  const displayGreenScore = user ? Number(user.green_score_kg) : currentUser.greenScoreKg;
  const displayAddress = [user?.locality, user?.city].filter(Boolean).join(', ') || currentUser.address;
  const authenticatedRoleTitle = user?.role === 'RECYCLER'
    ? (language === 'hi' ? 'रीसाइकलर' : 'Recycler')
    : t.roles[role].title;

  const handleSignOut = async () => {
    try {
      await logout();
    } catch (error) {
      showToast(
        `You were signed out on this device, but the server could not clear the session: ${error instanceof Error ? error.message : 'network error'}`,
        'error',
      );
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18">
          
          {/* Left: Mobile hamburger & Logo */}
          <div className="flex items-center gap-3">
            <button
              onClick={onMenuToggle}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
              aria-label="Toggle navigation"
            >
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-forest-800 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
                <Recycle className="w-5 h-5 animate-spin-slow" />
              </div>
              <div>
                <span className="text-lg sm:text-xl font-bold tracking-tight text-forest-900 flex items-center gap-1.5">
                  Scrap<span className="text-emerald-500">Setu</span>
                  <span className="hidden md:inline-block px-1.5 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded bg-forest-100 text-forest-800 border border-forest-200">
                    2026
                  </span>
                </span>
                <p className="text-[11px] text-slate-500 hidden sm:block -mt-0.5">
                  {t.tagline}
                </p>
              </div>
            </div>
          </div>

          {/* Authenticated role badge */}
          <div className="hidden lg:flex items-center bg-slate-100/90 p-1 rounded-2xl border border-slate-200/70 shadow-inner">
            <span className="text-[11px] font-semibold text-slate-500 px-2.5 flex items-center gap-1 uppercase tracking-wider">
              <Sparkles className="w-3 h-3 text-emerald-500" />
              {authenticatedRoleTitle}
            </span>
          </div>

          {/* Right: Language and Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Language Toggle (EN / HI) */}
            <button
              onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 hover:text-forest-800 bg-white border border-slate-200 hover:border-forest-300 transition-all shadow-xs"
              title="Toggle English / Hindi"
            >
              <Globe className="w-3.5 h-3.5 text-emerald-500" />
              <span className="font-bold">{language === 'en' ? 'हिन्दी' : 'English'}</span>
            </button>

            {/* Sign out */}
            <button
              onClick={() => void handleSignOut()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-forest-800 bg-forest-50 hover:bg-forest-100 border border-forest-200 hover:border-forest-300 transition-all shadow-xs"
              title="Sign out of ScrapSetu"
            >
              <LogIn className="w-3.5 h-3.5 text-emerald-600" />
              <span>{language === 'hi' ? 'लॉगआउट' : 'Sign out'}</span>
            </button>

            {/* User Profile Avatar & Badge */}
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2 p-1 pl-2 rounded-2xl border border-slate-200 hover:border-slate-300 bg-white transition-all shadow-xs"
              >
                <div className="hidden md:block text-right">
                  <div className="text-xs font-bold text-slate-900 leading-tight flex items-center gap-1">
                    {displayName}
                    {displayVerified && (
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 inline" />
                    )}
                  </div>
                  <div className="text-[10px] text-slate-500 capitalize leading-none">
                    {displayBusiness}
                  </div>
                </div>
                <img
                  src={currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                  alt={displayName}
                  className="w-8 h-8 rounded-xl object-cover ring-2 ring-forest-100"
                />
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-soft-lg border border-slate-200 p-3 z-50 animate-in fade-in zoom-in-95">
                  <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                    <img
                      src={currentUser.avatar}
                      alt={displayName}
                      className="w-10 h-10 rounded-xl object-cover"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1">
                        {displayName}
                        {displayVerified && <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />}
                      </div>
                      <div className="text-[11px] text-slate-500">{user?.phone || currentUser.phone}</div>
                      <span className="inline-block mt-0.5 px-2 py-0.2 text-[9px] font-bold rounded-full bg-forest-100 text-forest-800">
                        {user?.role || currentUser.role.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="py-2 space-y-1.5 text-xs text-slate-600">
                    <div className="flex justify-between py-1 px-2 rounded-lg bg-mint-50 border border-forest-100">
                      <span className="text-forest-900 font-medium">Recycled Volume:</span>
                      <span className="font-bold text-forest-800">{displayGreenScore} kg</span>
                    </div>
                    <div className="px-2 py-1 text-[11px] text-slate-500">
                      📍 {displayAddress}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs">
                    <button
                      onClick={() => { setShowProfileMenu(false); void handleSignOut(); }}
                      className="w-full rounded-lg px-2 py-1.5 text-left font-semibold text-forest-800 hover:bg-forest-50"
                    >
                      {language === 'hi' ? 'लॉगआउट' : 'Sign out'}
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>
      </div>
    </header>
  );
};
