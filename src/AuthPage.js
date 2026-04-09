// src/AuthPage.jsx

import { useState, useEffect } from "react";
import { authApi, slideshowPublicApi } from './services/api';
import BackgroundSlideshow from './components/BackgroundSlideshow';

// ─── Token Helper ────────────────────────────────────
const storeSession = (data) => {
  const role = data.user?.role || (data.user?.is_staff ? 'ADMIN' : '');
  localStorage.setItem("access_token",   data.access);
  localStorage.setItem("refresh_token",  data.refresh);
  localStorage.setItem("user",           JSON.stringify(data.user));
  localStorage.setItem("role",           role);
  localStorage.setItem("is_first_login", data.is_first_login ? "true" : "false");
};

// ─── Icons ───────────────────────────────────────────
const EyeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
  </svg>
);
const EyeOffIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M3 3l18 18"/>
  </svg>
);
const Spinner = () => (
  <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
  </svg>
);
const LockIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
  </svg>
);
const MailIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
  </svg>
);

// ─── Main Component ──────────────────────────────────
export default function AuthPage() {
  const [form, setForm]               = useState({ email: "", password: "" });
  const [showPw, setShowPw]           = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [mounted, setMounted]         = useState(false);
  const [slides, setSlides]           = useState([]);

  useEffect(() => {
    slideshowPublicApi.list()
      .then(data => setSlides(Array.isArray(data) ? data : []))
      .catch(() => setSlides([]));
  }, []);

  useEffect(() => {
    const id = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(id);
  }, []);

  const handleChange = e => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const validate = () => {
    const errs = {};
    if (!form.email)    errs.email    = "Email is required";
    if (!form.password) errs.password = "Password is required";
    return errs;
  };

  const handleLogin = async e => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setFieldErrors(errs); return; }
    setLoading(true); setError(""); setFieldErrors({});
    try {
      const data = await authApi.login({ email: form.email.trim(), password: form.password.trim() });
      storeSession(data);
      window.location.href = data.is_first_login ? "/change-password" : "/dashboard";
    } catch (err) {
      setError(
        err?.error || err?.detail ||
        (Array.isArray(err?.non_field_errors) ? err.non_field_errors.join(' ') : null) ||
        "Invalid credentials. Please try again."
      );
    } finally { setLoading(false); }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex items-center justify-center font-sans">

      {/* ── Shared slideshow component ── */}
      <BackgroundSlideshow slides={slides} />

      <div
        className="relative z-20 w-full max-w-md mx-4"
        style={{
          paddingTop: '66px',
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(24px)',
          transition: 'opacity 0.7s ease, transform 0.7s ease',
        }}
      >
        {/* ── Floating Logo ── */}
        <div className="absolute top-0 left-1/2 z-30"
          style={{ transform: 'translateX(-50%)' }}>
          <div style={{
            borderRadius: '50%', padding: '3px',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.28), rgba(255,255,255,0.04))',
            boxShadow: '0 10px 48px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.08)',
          }}>
            <div style={{
              width: 120, height: 120, borderRadius: '50%',
              background: 'linear-gradient(160deg, #002d75 0%, #001740 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden',
              boxShadow: 'inset 0 2px 10px rgba(255,255,255,0.07)',
            }}>
              <img
                src="/rnp_logo.png"
                alt="Rwanda National Police"
                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', display: 'block' }}
                onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
              />
              <div style={{ display: 'none', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                <svg viewBox="0 0 64 72" style={{ width: 56, height: 56 }} fill="none">
                  <path d="M32 2L4 13v20c0 16 11 28 28 33 17-5 28-17 28-33V13L32 2z"
                    fill="rgba(255,255,255,0.14)" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5"/>
                  <path d="M32 10L10 19v14c0 11 8 20 22 24 14-4 22-13 22-24V19L32 10z"
                    fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.28)" strokeWidth="1"/>
                  <text x="32" y="42" textAnchor="middle" fill="white" fontSize="13" fontWeight="700" letterSpacing="1">RNP</text>
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* ── Glass Card ── */}
        <div className="rounded-3xl overflow-hidden" style={{
          background: 'rgba(0, 20, 51, 0.78)',
          backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
        }}>
          <div className="h-1 w-full bg-gradient-to-r from-[#003580] via-[#1a6bd4] to-[#003580]" />

          <div className="px-10 pb-10" style={{ paddingTop: '80px' }}>

            {/* Brand */}
            <div className="flex flex-col items-center mb-7">
              <h1 className="text-white text-xl font-bold tracking-wide text-center leading-tight">
                Rwanda National Police
              </h1>
              <p className="text-blue-300/80 text-xs font-medium tracking-[0.2em] uppercase mt-1">
                EquipmentTrack
              </p>
              <div className="mt-5 w-full flex items-center gap-3">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-white/30 text-xs tracking-widest uppercase">Secure Access</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="mb-5 px-4 py-3 rounded-xl bg-red-500/20 border border-red-400/30 flex items-center gap-2.5">
                <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-4">

              <div>
                <label className="block text-xs font-semibold text-blue-200/70 mb-1.5 tracking-wide uppercase">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-300/60">
                    <MailIcon />
                  </div>
                  <input
                    type="email" name="email" value={form.email}
                    onChange={handleChange} placeholder="your email"
                    autoComplete="email"
                    className={`w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder-white/25
                      border transition-all outline-none
                      focus:border-blue-400/60 focus:ring-2 focus:ring-blue-500/20
                      ${fieldErrors.email ? 'border-red-400/60' : 'border-white/15 hover:border-white/25'}`}
                    style={{ background: fieldErrors.email ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.06)' }}
                  />
                </div>
                {fieldErrors.email && <p className="text-red-400 text-xs mt-1.5 pl-1">{fieldErrors.email}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-blue-200/70 mb-1.5 tracking-wide uppercase">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-300/60">
                    <LockIcon />
                  </div>
                  <input
                    type={showPw ? "text" : "password"} name="password" value={form.password}
                    onChange={handleChange} placeholder="••••••••••"
                    autoComplete="current-password"
                    className={`w-full pl-10 pr-11 py-3 rounded-xl text-sm text-white placeholder-white/25
                      border transition-all outline-none
                      focus:border-blue-400/60 focus:ring-2 focus:ring-blue-500/20
                      ${fieldErrors.password ? 'border-red-400/60' : 'border-white/15 hover:border-white/25'}`}
                    style={{ background: fieldErrors.password ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.06)' }}
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-blue-300/50 hover:text-white transition-colors">
                    {showPw ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
                {fieldErrors.password && <p className="text-red-400 text-xs mt-1.5 pl-1">{fieldErrors.password}</p>}
              </div>

              <button
                type="submit" disabled={loading}
                className="w-full mt-2 py-3.5 rounded-xl font-bold text-sm tracking-wide
                           flex items-center justify-center gap-2.5 transition-all duration-200
                           disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98]"
                style={{
                  background: loading ? 'rgba(0,53,128,0.7)' : 'linear-gradient(135deg, #003580 0%, #0050cc 50%, #003580 100%)',
                  boxShadow: loading ? 'none' : '0 4px 24px rgba(0,80,204,0.4)',
                  color: 'white',
                }}
              >
                {loading ? (
                  <><Spinner /><span>Authenticating…</span></>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/>
                    </svg>
                    Sign In
                  </>
                )}
              </button>

            </form>

            <div className="mt-8 pt-6 border-t border-white/8 text-center">
              <p className="text-white/25 text-xs">
                © {new Date().getFullYear()} Rwanda National Police · All rights reserved
              </p>
            </div>

          </div>
        </div>

        <div className="absolute inset-0 rounded-3xl pointer-events-none -z-10"
          style={{ boxShadow: '0 0 80px rgba(0,80,204,0.25)', filter: 'blur(20px)' }} />

      </div>

      <div className="absolute bottom-0 left-0 right-0 z-20 h-1
        bg-gradient-to-r from-transparent via-[#003580]/80 to-transparent" />

    </div>
  );
}