import { useState, useEffect } from 'react';
import { usersApi } from '../services/api';

const BASE =
  (process.env.REACT_APP_API_URL || 'https://historical-clair-it-infrastracture-system-e80431e7.koyeb.app') +
  '/api/v1';

// ─── Icons (match AuthPage.js) ───────────────────────────────────────────────
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

// ─── Background Slideshow (same as AuthPage.js) ──────────────────────────────
function BackgroundSlideshow({ slides }) {
  const [current, setCurrent] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    setCurrent(0);
    setFade(true);
  }, [slides.length]);

  useEffect(() => {
    if (slides.length < 2) return;
    const iv = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setCurrent(p => (p + 1) % slides.length);
        setFade(true);
      }, 600);
    }, 5000);
    return () => clearInterval(iv);
  }, [slides.length]);

  return (
    <>
      <div className="absolute inset-0 bg-[#001433] z-0" />
      {slides.map((slide, i) => (
        <div
          key={slide.id}
          className="absolute inset-0 bg-cover bg-center z-[1] transition-opacity duration-700"
          style={{
            backgroundImage: `url(${slide.image_url})`,
            opacity: i === current ? (fade ? 0.28 : 0) : 0,
          }}
        />
      ))}
      <div
        className="absolute inset-0 z-[2]"
        style={{
          backgroundImage: `
          radial-gradient(circle at 20% 50%, rgba(0,53,128,0.55) 0%, transparent 60%),
          radial-gradient(circle at 80% 20%, rgba(0,32,96,0.45) 0%, transparent 50%),
          radial-gradient(circle at 60% 80%, rgba(0,20,51,0.6) 0%, transparent 55%)
        `,
        }}
      />
      <div
        className="absolute inset-0 z-[3] opacity-[0.04]"
        style={{
          backgroundImage: `
          linear-gradient(rgba(255,255,255,1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)
        `,
          backgroundSize: '60px 60px',
        }}
      />
      {slides.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-[10]">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setCurrent(i);
                setFade(true);
              }}
              className={`rounded-full transition-all duration-300 ${
                i === current ? 'w-6 h-2 bg-white' : 'w-2 h-2 bg-white/30 hover:bg-white/50'
              }`}
            />
          ))}
        </div>
      )}
    </>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────
export default function ChangePassword() {
  const [form, setForm] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [show, setShow] = useState({ old: false, new: false, confirm: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [slides, setSlides] = useState([]);

  useEffect(() => {
    fetch(`${BASE}/slideshow/public/`)
      .then(r => (r.ok ? r.json() : []))
      .then(data => setSlides(Array.isArray(data) ? data : []))
      .catch(() => setSlides([]));
  }, []);

  useEffect(() => {
    const id = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(id);
  }, []);

  const handleChange = e => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const toggleShow = field => setShow(prev => ({ ...prev, [field]: !prev[field] }));

  const validate = () => {
    const errors = {};
    if (!form.old_password) errors.old_password = 'Current password is required.';
    if (!form.new_password) errors.new_password = 'New password is required.';
    else if (form.new_password.length < 8) errors.new_password = 'Must be at least 8 characters.';
    if (!form.confirm_password) errors.confirm_password = 'Please confirm your new password.';
    else if (form.new_password !== form.confirm_password)
      errors.confirm_password = 'Passwords do not match.';
    return errors;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    setError('');
    setFieldErrors({});

    try {
      await usersApi.changePassword({
        old_password: form.old_password,
        new_password: form.new_password,
        confirm_password: form.confirm_password,
      });

      localStorage.setItem('is_first_login', 'false');
      setSuccess(true);
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1500);
    } catch (err) {
      if (err && typeof err === 'object') {
        const fieldMap = {};
        if (err.old_password) fieldMap.old_password = err.old_password[0] || err.old_password;
        if (err.new_password) fieldMap.new_password = err.new_password[0] || err.new_password;
        if (err.confirm_password) fieldMap.confirm_password = err.confirm_password[0] || err.confirm_password;
        if (Object.keys(fieldMap).length) {
          setFieldErrors(fieldMap);
          return;
        }
      }
      setError(err?.detail || err?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const pwdField = (key, name, label, auto) => {
    const err = fieldErrors[name];
    return (
      <div>
        <label className="block text-xs font-semibold text-blue-200/70 mb-1.5 tracking-wide uppercase">
          {label}
        </label>
        <div className="relative">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-300/60">
            <LockIcon />
          </div>
          <input
            type={show[key] ? 'text' : 'password'}
            name={name}
            value={form[name]}
            onChange={handleChange}
            autoComplete={auto}
            placeholder="••••••••••"
            className={`w-full pl-10 pr-11 py-3 rounded-xl text-sm text-white placeholder-white/25
              border transition-all outline-none
              focus:border-blue-400/60 focus:ring-2 focus:ring-blue-500/20
              ${err ? 'border-red-400/60' : 'border-white/15 hover:border-white/25'}`}
            style={{ background: err ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.06)' }}
          />
          <button
            type="button"
            onClick={() => toggleShow(key)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-blue-300/50 hover:text-white transition-colors"
          >
            {show[key] ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
        {err && <p className="text-red-400 text-xs mt-1.5 pl-1">{err}</p>}
      </div>
    );
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex items-center justify-center font-sans">
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
        <div className="absolute top-0 left-1/2 z-30" style={{ transform: 'translateX(-50%)' }}>
          <div
            style={{
              borderRadius: '50%',
              padding: '3px',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.28), rgba(255,255,255,0.04))',
              boxShadow: '0 10px 48px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.08)',
            }}
          >
            <div
              style={{
                width: 120,
                height: 120,
                borderRadius: '50%',
                background: 'linear-gradient(160deg, #002d75 0%, #001740 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                boxShadow: 'inset 0 2px 10px rgba(255,255,255,0.07)',
              }}
            >
              <img
                src="/rnp_logo.png"
                alt="Rwanda National Police"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center',
                  display: 'block',
                }}
                onError={e => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div
                style={{
                  display: 'none',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  height: '100%',
                }}
              >
                <svg viewBox="0 0 64 72" style={{ width: 56, height: 56 }} fill="none">
                  <path
                    d="M32 2L4 13v20c0 16 11 28 28 33 17-5 28-17 28-33V13L32 2z"
                    fill="rgba(255,255,255,0.14)"
                    stroke="rgba(255,255,255,0.55)"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M32 10L10 19v14c0 11 8 20 22 24 14-4 22-13 22-24V19L32 10z"
                    fill="rgba(255,255,255,0.07)"
                    stroke="rgba(255,255,255,0.28)"
                    strokeWidth="1"
                  />
                  <text x="32" y="42" textAnchor="middle" fill="white" fontSize="13" fontWeight="700" letterSpacing="1">
                    RNP
                  </text>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div
          className="rounded-3xl overflow-hidden"
          style={{
            background: 'rgba(0, 20, 51, 0.78)',
            backdropFilter: 'blur(28px)',
            WebkitBackdropFilter: 'blur(28px)',
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 32px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
          }}
        >
          <div className="h-1 w-full bg-gradient-to-r from-[#003580] via-[#1a6bd4] to-[#003580]" />

          <div className="px-10 pb-10" style={{ paddingTop: '80px' }}>
            <div className="flex flex-col items-center mb-6">
              <h1 className="text-white text-xl font-bold tracking-wide text-center leading-tight">
                Rwanda National Police
              </h1>
              <p className="text-blue-300/80 text-xs font-medium tracking-[0.2em] uppercase mt-1">
                IT Infrastructure System
              </p>
              <div className="mt-5 w-full flex items-center gap-3">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-white/30 text-xs tracking-widest uppercase">Set new password</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>
            </div>

           

            {success && (
              <div className="mb-5 px-4 py-3 rounded-xl bg-emerald-500/15 border border-emerald-400/35 flex items-center gap-2.5">
                <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-emerald-200 text-sm">Password changed successfully! Redirecting…</p>
              </div>
            )}

            {error && (
              <div className="mb-5 px-4 py-3 rounded-xl bg-red-500/20 border border-red-400/30 flex items-center gap-2.5">
                <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {pwdField('old', 'old_password', 'Current password', 'current-password')}
              {pwdField('new', 'new_password', 'New password', 'new-password')}
              {pwdField('confirm', 'confirm_password', 'Confirm new password', 'new-password')}

              <button
                type="submit"
                disabled={loading || success}
                className="w-full mt-2 py-3.5 rounded-xl font-bold text-sm tracking-wide
                  flex items-center justify-center gap-2.5 transition-all duration-200
                  disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98]"
                style={{
                  background:
                    loading || success
                      ? 'rgba(0,53,128,0.7)'
                      : 'linear-gradient(135deg, #003580 0%, #0050cc 50%, #003580 100%)',
                  boxShadow: loading || success ? 'none' : '0 4px 24px rgba(0,80,204,0.4)',
                  color: 'white',
                }}
              >
                {loading ? (
                  <>
                    <Spinner />
                    <span>Updating…</span>
                  </>
                ) : success ? (
                  'Done'
                ) : (
                  <>
                    <LockIcon />
                    <span>Set new password</span>
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

        <div
          className="absolute inset-0 rounded-3xl pointer-events-none -z-10"
          style={{ boxShadow: '0 0 80px rgba(0,80,204,0.25)', filter: 'blur(20px)' }}
        />
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-20 h-1 bg-gradient-to-r from-transparent via-[#003580]/80 to-transparent" />
    </div>
  );
}
