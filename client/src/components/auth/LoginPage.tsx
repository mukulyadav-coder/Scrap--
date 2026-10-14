import React, { FormEvent, useState } from 'react';
import {
  AlertCircle, ArrowLeft, ArrowRight, Check, Eye, EyeOff, Factory, Leaf, LoaderCircle,
  LockKeyhole, Mail, MapPin, Recycle, ShieldCheck, Truck, UserRound, Users, type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AuthRole, RegisterPayload } from '../../services/auth';

type Screen = 'login' | 'register' | 'forgot';
type RegisterRole = Exclude<AuthRole, 'ADMIN'>;

const roles: { id: RegisterRole; label: string; description: string; icon: LucideIcon }[] = [
  { id: 'SELLER', label: 'Seller', description: 'List household or business recyclables.', icon: UserRound },
  { id: 'COLLECTOR', label: 'Collector', description: 'Collect scrap and manage your inventory.', icon: Truck },
  { id: 'BUYER', label: 'Buyer', description: 'Purchase available recyclable materials.', icon: Factory },
  { id: 'RECYCLER', label: 'Recycler', description: 'Source materials for your recycling business.', icon: Recycle },
];

const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10';
const labelClass = 'mb-1.5 block text-sm font-medium text-slate-700';

export const LoginPage: React.FC = () => {
  const { login, register, logout, restorationError } = useAuth();
  const [screen, setScreen] = useState<Screen>('login');
  const [adminLogin, setAdminLogin] = useState(false);
  const [role, setRole] = useState<RegisterRole>('SELLER');
  const [email, setEmail] = useState(() => {
    try {
      return localStorage.getItem('scrapsetu_remember_email') === 'true'
        ? localStorage.getItem('scrapsetu_saved_email') || ''
        : '';
    } catch {
      return '';
    }
  });
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [locality, setLocality] = useState('');
  const [language, setLanguage] = useState('en');
  const [sellerType, setSellerType] = useState('HOUSEHOLD');
  const [businessName, setBusinessName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(() => {
    try {
      return localStorage.getItem('scrapsetu_remember_email') === 'true';
    } catch {
      return false;
    }
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success' | 'info'; text: string } | null>(null);

  const switchScreen = (next: Screen) => {
    setMessage(null);
    setScreen(next);
  };

  const passwordStrength = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
  ].filter(Boolean).length;

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setMessage({ type: 'error', text: 'Enter a valid email address.' });
      return;
    }
    if (!password) {
      setMessage({ type: 'error', text: 'Enter your password.' });
      return;
    }

    setBusy(true);
    try {
      const profile = await login(email.trim(), password);
      if (adminLogin && profile.role !== 'ADMIN') {
        await logout();
        setMessage({ type: 'error', text: 'This account does not have administrator access.' });
        return;
      }
      try {
        if (rememberEmail) {
          localStorage.setItem('scrapsetu_remember_email', 'true');
          localStorage.setItem('scrapsetu_saved_email', email.trim());
        } else {
          localStorage.removeItem('scrapsetu_remember_email');
          localStorage.removeItem('scrapsetu_saved_email');
        }
      } catch {
        setMessage({ type: 'info', text: 'Signed in. This browser could not save your email preference.' });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Sign in failed. Please try again.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    if (!fullName.trim() || !email.trim() || !phone.trim() || !city.trim()) {
      setMessage({ type: 'error', text: 'Complete all required fields.' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setMessage({ type: 'error', text: 'Enter a valid email address.' });
      return;
    }
    if (!/^\+?[0-9\s()-]{10,20}$/.test(phone.trim())) {
      setMessage({ type: 'error', text: 'Enter a valid phone number (10–15 digits).'});
      return;
    }
    if (
      password.length < 8 ||
      new TextEncoder().encode(password).length > 72 ||
      !/[A-Z]/.test(password) ||
      !/[0-9]/.test(password)
    ) {
      setMessage({ type: 'error', text: 'Use 8–72 UTF-8 bytes, including an uppercase letter and a number.' });
      return;
    }
    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    const payload: RegisterPayload = {
      full_name: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      password,
      role,
      city: city.trim(),
      locality: locality.trim() || undefined,
      preferred_language: language,
      ...(role === 'SELLER' ? { seller_type: sellerType } : {}),
      ...((['BUYER', 'RECYCLER'].includes(role) || (role === 'SELLER' && sellerType === 'BUSINESS')) && businessName.trim()
        ? { business_name: businessName.trim() }
        : {}),
    };

    setBusy(true);
    try {
      await register(payload);
      setPassword('');
      setConfirmPassword('');
      setScreen('login');
      setMessage({ type: 'success', text: 'Your account was created. Sign in to continue.' });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Registration failed. Please try again.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleForgot = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage({
      type: 'info',
      text: 'Password recovery is not configured on the ScrapSetu backend yet. Please contact support.',
    });
  };

  const field = (
    label: string,
    value: string,
    onChange: (value: string) => void,
    options: { type?: string; autoComplete?: string; name?: string; placeholder?: string; required?: boolean; icon?: LucideIcon } = {},
  ) => {
    const Icon = options.icon;
    return (
      <label className="block">
        <span className={labelClass}>{label}{options.required && <span aria-hidden="true"> *</span>}</span>
        <span className="relative block">
          {Icon && <Icon aria-hidden="true" className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />}
          <input
            className={`${inputClass} ${Icon ? 'pl-10' : ''}`}
            type={options.type || 'text'}
            name={options.name}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            autoComplete={options.autoComplete}
            placeholder={options.placeholder}
            required={options.required}
          />
        </span>
      </label>
    );
  };

  const passwordField = (confirm = false) => (
    <label className="block">
      <span className={labelClass}>{confirm ? 'Confirm password' : 'Password'} *</span>
      <span className="relative block">
        <LockKeyhole aria-hidden="true" className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          className={`${inputClass} pl-10 pr-11`}
          type={(confirm ? showConfirmPassword : showPassword) ? 'text' : 'password'}
          name={confirm ? 'confirmPassword' : 'password'}
          value={confirm ? confirmPassword : password}
          onChange={(event) => confirm ? setConfirmPassword(event.target.value) : setPassword(event.target.value)}
          autoComplete={confirm ? 'new-password' : screen === 'login' ? 'current-password' : 'new-password'}
          minLength={screen === 'register' ? 8 : undefined}
          required
        />
        <button
          type="button"
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600"
          onClick={() => confirm ? setShowConfirmPassword(!showConfirmPassword) : setShowPassword(!showPassword)}
          aria-label={(confirm ? showConfirmPassword : showPassword) ? 'Hide password' : 'Show password'}
        >
          {(confirm ? showConfirmPassword : showPassword)
            ? <EyeOff aria-hidden="true" className="h-4 w-4" />
            : <Eye aria-hidden="true" className="h-4 w-4" />}
        </button>
      </span>
      {!confirm && screen === 'register' && (
        <span className="mt-2 flex items-center gap-2" aria-live="polite">
          {[0, 1, 2].map((index) => (
            <span
              key={index}
              className={`h-1.5 flex-1 rounded-full ${index < passwordStrength ? 'bg-teal-600' : 'bg-slate-200'}`}
            />
          ))}
          <span className="text-xs text-slate-500">
            {passwordStrength === 3 ? 'Strong' : passwordStrength === 2 ? 'Fair' : 'Use 8+ chars, uppercase & number'}
          </span>
        </span>
      )}
    </label>
  );

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl overflow-hidden rounded-3xl bg-white shadow-soft-lg lg:grid-cols-[0.9fr_1.1fr]">
        <aside className="relative hidden overflow-hidden bg-gradient-to-br from-teal-950 via-teal-900 to-emerald-800 p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
          <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-emerald-300/10 blur-3xl" />
          <div className="absolute -bottom-28 -left-20 h-80 w-80 rounded-full bg-teal-300/10 blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/20">
                <Recycle aria-hidden="true" className="h-7 w-7" />
              </span>
              <span className="text-2xl font-bold tracking-tight">ScrapSetu</span>
            </div>
            <div className="mt-24 max-w-md">
              <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-teal-200">A cleaner tomorrow starts here</p>
              <h1 className="text-4xl font-semibold leading-tight xl:text-5xl">Give recyclables a second life.</h1>
              <p className="mt-5 text-base leading-7 text-teal-50/80">
                Connect with trusted local collectors, buyers and recycling partners in one circular marketplace.
              </p>
            </div>
          </div>
          <div className="relative flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-4">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-400/20">
              <Leaf aria-hidden="true" className="h-5 w-5 text-emerald-200" />
            </span>
            <div>
              <p className="text-sm font-semibold">Small actions. Lasting impact.</p>
              <p className="mt-0.5 text-xs text-teal-50/70">Better for your community and the planet.</p>
            </div>
          </div>
        </aside>

        <section className="flex items-center justify-center px-5 py-7 sm:px-10 sm:py-10">
          <div className="w-full max-w-xl">
            <div className="mb-7 flex items-center gap-2 lg:hidden">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-800 text-white">
                <Recycle aria-hidden="true" className="h-5 w-5" />
              </span>
              <span className="text-xl font-bold text-teal-950">ScrapSetu</span>
            </div>

            {screen !== 'login' && (
              <button
                type="button"
                onClick={() => switchScreen('login')}
                className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-600"
              >
                <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                Back to sign in
              </button>
            )}

            <div className="mb-6">
              <p className="text-sm font-semibold text-teal-700">
                {screen === 'register' ? 'Join the circular economy' : screen === 'forgot' ? 'Account assistance' : adminLogin ? 'Administrator access' : 'Welcome back'}
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                {screen === 'register' ? 'Create your account' : screen === 'forgot' ? 'Forgot your password?' : 'Sign in to ScrapSetu'}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {screen === 'register'
                  ? 'Tell us a little about yourself to get started.'
                  : screen === 'forgot'
                    ? 'Enter your email to learn about account recovery options.'
                    : 'Access your account and continue where you left off.'}
              </p>
            </div>

            {(message || restorationError) && (
              <div
                role={message?.type === 'error' || restorationError ? 'alert' : 'status'}
                className={`mb-5 flex items-start gap-2.5 rounded-xl border p-3.5 text-sm ${
                  message?.type === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : message?.type === 'info'
                      ? 'border-blue-200 bg-blue-50 text-blue-800'
                      : 'border-rose-200 bg-rose-50 text-rose-800'
                }`}
              >
                {message?.type === 'success'
                  ? <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                  : <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />}
                <span>{message?.text || restorationError}</span>
              </div>
            )}

            {screen === 'login' && (
              <>
                <div className="mb-5 grid grid-cols-2 rounded-xl bg-slate-100 p-1" role="tablist" aria-label="Sign-in type">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={!adminLogin}
                    onClick={() => { setAdminLogin(false); setMessage(null); }}
                    className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${!adminLogin ? 'bg-white text-teal-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    User sign in
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={adminLogin}
                    onClick={() => { setAdminLogin(true); setMessage(null); }}
                    className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${adminLogin ? 'bg-white text-teal-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    <ShieldCheck aria-hidden="true" className="h-4 w-4" /> Admin sign in
                  </button>
                </div>
                <form className="space-y-4" onSubmit={handleLogin} autoComplete="on" noValidate>
                  {field('Email address', email, setEmail, { type: 'email', name: 'email', autoComplete: 'username', icon: Mail, required: true })}
                  {passwordField()}
                  <div className="flex items-center justify-between gap-3">
                    <label className="inline-flex items-center gap-2 text-sm text-slate-600">
                      <input
                        type="checkbox"
                        checked={rememberEmail}
                        onChange={(event) => setRememberEmail(event.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600"
                      />
                      Remember email
                    </label>
                    <button type="button" onClick={() => switchScreen('forgot')} className="text-sm font-semibold text-teal-700 hover:text-teal-900">
                      Forgot password?
                    </button>
                  </div>
                  <button
                    type="submit"
                    disabled={busy}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-800 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-900 focus:outline-none focus:ring-4 focus:ring-teal-700/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {busy ? <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" /> : null}
                    {busy ? 'Signing in…' : 'Sign in'}
                    {!busy && <ArrowRight aria-hidden="true" className="h-4 w-4" />}
                  </button>
                </form>
                {!adminLogin && (
                  <p className="mt-6 text-center text-sm text-slate-600">
                    New to ScrapSetu?{' '}
                    <button onClick={() => switchScreen('register')} className="font-semibold text-teal-700 hover:text-teal-900">
                      Create an account
                    </button>
                  </p>
                )}
                {adminLogin && (
                  <p className="mt-5 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                    <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                    Administrator accounts are provisioned securely by platform operations and cannot be created here.
                  </p>
                )}
              </>
            )}

            {screen === 'register' && (
              <form className="space-y-5" onSubmit={handleRegister} noValidate>
                <fieldset>
                  <legend className="mb-2.5 text-sm font-semibold text-slate-800">Choose your account type</legend>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {roles.map(({ id, label, description, icon: Icon }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setRole(id)}
                        aria-pressed={role === id}
                        className={`flex min-h-20 items-start gap-3 rounded-xl border p-3 text-left transition focus:outline-none focus:ring-2 focus:ring-teal-600 ${
                          role === id ? 'border-teal-700 bg-teal-50 ring-2 ring-teal-700/10' : 'border-slate-200 hover:border-teal-300'
                        }`}
                      >
                        <Icon aria-hidden="true" className={`mt-0.5 h-5 w-5 shrink-0 ${role === id ? 'text-teal-800' : 'text-slate-500'}`} />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between text-sm font-semibold text-slate-900">
                            {label}
                            {role === id && <Check aria-hidden="true" className="h-4 w-4 text-teal-700" />}
                          </span>
                          <span className="mt-1 block text-xs leading-4 text-slate-500">{description}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </fieldset>
                <div className="grid gap-4 sm:grid-cols-2">
                  {field('Full name', fullName, setFullName, { autoComplete: 'name', required: true })}
                  {field('Email address', email, setEmail, { type: 'email', autoComplete: 'email', required: true })}
                  {field('Phone number', phone, setPhone, { type: 'tel', autoComplete: 'tel', placeholder: '+91 9876543210', required: true })}
                  {field('City', city, setCity, { autoComplete: 'address-level2', required: true, icon: MapPin })}
                  {field('Locality (optional)', locality, setLocality, { autoComplete: 'address-level3' })}
                  <label className="block">
                    <span className={labelClass}>Preferred language</span>
                    <select className={inputClass} value={language} onChange={(event) => setLanguage(event.target.value)}>
                      <option value="en">English</option>
                      <option value="hi">हिन्दी</option>
                    </select>
                  </label>
                  {role === 'SELLER' && (
                    <>
                      <label className="block sm:col-span-2">
                        <span className={labelClass}>Seller type</span>
                        <select className={inputClass} value={sellerType} onChange={(event) => setSellerType(event.target.value)}>
                          <option value="HOUSEHOLD">Household</option>
                          <option value="BUSINESS">Business</option>
                        </select>
                      </label>
                      {sellerType === 'BUSINESS' && (
                        <div className="sm:col-span-2">
                          {field('Business name (optional)', businessName, setBusinessName, { autoComplete: 'organization' })}
                        </div>
                      )}
                    </>
                  )}
                  {['BUYER', 'RECYCLER'].includes(role) && (
                    <div className="sm:col-span-2">
                      {field('Business name (optional)', businessName, setBusinessName, { autoComplete: 'organization' })}
                    </div>
                  )}
                  <div>{passwordField()}</div>
                  <div>{passwordField(true)}</div>
                </div>
                <p className="text-xs text-slate-500">* Required fields. Admin accounts are provisioned separately.</p>
                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-800 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-900 focus:outline-none focus:ring-4 focus:ring-teal-700/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy ? <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Users aria-hidden="true" className="h-4 w-4" />}
                  {busy ? 'Creating account…' : 'Create account'}
                </button>
                <p className="text-center text-sm text-slate-600">
                  Already have an account?{' '}
                  <button type="button" onClick={() => switchScreen('login')} className="font-semibold text-teal-700 hover:text-teal-900">
                    Sign in
                  </button>
                </p>
              </form>
            )}

            {screen === 'forgot' && (
              <form className="space-y-4" onSubmit={handleForgot}>
                {field('Email address', email, setEmail, { type: 'email', autoComplete: 'email', required: true, icon: Mail })}
                <button type="submit" className="w-full rounded-xl bg-teal-800 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-900">
                  Continue
                </button>
                <p className="text-center text-xs leading-5 text-slate-500">
                  <LockKeyhole aria-hidden="true" className="mr-1 inline h-3.5 w-3.5" />
                  We won’t send a recovery email until the backend provides a secure reset flow.
                </p>
              </form>
            )}
          </div>
        </section>
      </div>
    </main>
  );
};
