import { useState } from "react";
import { usersApi } from "../services/api";

// ─── Icons ────────────────────────────────────────────
const EyeIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M2.458 12C3.732 7.943 7.523 5 12 5
      c4.478 0 8.268 2.943 9.542 7
      -1.274 4.057-5.064 7-9.542 7
      -4.477 0-8.268-2.943-9.542-7z"/>
  </svg>
);

const EyeOffIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M13.875 18.825A10.05 10.05 0 0112 19
      c-4.478 0-8.268-2.943-9.543-7
      a9.97 9.97 0 011.563-3.029
      m5.858.908a3 3 0 114.243 4.243
      M9.878 9.878l4.242 4.242"/>
  </svg>
);

const Spinner = () => (
  <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10"
      stroke="currentColor" strokeWidth="4" fill="none"/>
    <path className="opacity-75" fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
  </svg>
);

// ─── Password Input ───────────────────────────────────
const PasswordInput = ({ label, name, value, onChange, error, show, onToggle }) => (
  <div>
    <label className="block text-xs font-semibold mb-2 text-slate-500">{label}</label>
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        name={name}
        value={value}
        onChange={onChange}
        autoComplete="new-password"
        className={`w-full px-4 py-3 border rounded-xl text-sm pr-11
          ${error ? "border-red-400 bg-red-50" : "border-slate-200"}
          focus:ring-2 focus:ring-[#003580]/30 focus:outline-none`}
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
      >
        {show ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
);

// ─── Main Component ───────────────────────────────────
export default function ChangePassword() {
  const [form, setForm] = useState({
    old_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [show, setShow]           = useState({ old: false, new: false, confirm: false });
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess]     = useState(false);

  const handleChange = (e) =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const toggleShow = (field) =>
    setShow(prev => ({ ...prev, [field]: !prev[field] }));

  const validate = () => {
    const errors = {};
    if (!form.old_password)     errors.old_password     = "Current password is required.";
    if (!form.new_password)     errors.new_password     = "New password is required.";
    else if (form.new_password.length < 8)
                                errors.new_password     = "Must be at least 8 characters.";
    if (!form.confirm_password) errors.confirm_password = "Please confirm your new password.";
    else if (form.new_password !== form.confirm_password)
                                errors.confirm_password = "Passwords do not match.";
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    setError("");
    setFieldErrors({});

    try {
      await usersApi.changePassword({
        old_password:     form.old_password,
        new_password:     form.new_password,
        confirm_password: form.confirm_password,
      });

      // Mark first login as done locally
      localStorage.setItem("is_first_login", "false");

      setSuccess(true);
      // Brief pause so user sees the success message, then redirect
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 1500);
    } catch (err) {
      // Surface field-level errors from DRF or a general error
      if (err && typeof err === "object") {
        const fieldMap = {};
        if (err.old_password)     fieldMap.old_password     = err.old_password[0] || err.old_password;
        if (err.new_password)     fieldMap.new_password     = err.new_password[0] || err.new_password;
        if (err.confirm_password) fieldMap.confirm_password = err.confirm_password[0] || err.confirm_password;
        if (Object.keys(fieldMap).length) {
          setFieldErrors(fieldMap);
          return;
        }
      }
      setError(err?.detail || err?.error || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">

      {/* Left branding panel */}
      <div className="hidden lg:flex w-5/12 flex-col bg-[#001f3f] text-white items-center justify-center p-12 gap-6">
        <div>
          <h1 className="text-4xl font-bold mb-3">Security Setup</h1>
          <p className="text-white/70 leading-relaxed">
            For your account's security, you must set a new password before accessing the system.
          </p>
        </div>
        <ul className="text-white/60 text-sm space-y-2 mt-4">
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block"/>
            At least 8 characters long
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block"/>
            Different from your temporary password
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block"/>
            You won't be asked again after this
          </li>
        </ul>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center bg-slate-100 p-6">
        <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl">

          {/* Header */}
          <div className="mb-6">
            <div className="w-12 h-12 rounded-full bg-[#003580]/10 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-[#003580]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Change Your Password</h2>
            <p className="text-sm text-slate-500 mt-1">
              This is your first login. Please set a new password to continue.
            </p>
          </div>

          {/* Success state */}
          {success && (
            <div className="mb-5 flex items-center gap-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
              </svg>
              Password changed successfully! Redirecting…
            </div>
          )}

          {/* General error */}
          {error && (
            <div className="mb-5 text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <PasswordInput
              label="Current Password"
              name="old_password"
              value={form.old_password}
              onChange={handleChange}
              error={fieldErrors.old_password}
              show={show.old}
              onToggle={() => toggleShow("old")}
            />

            <PasswordInput
              label="New Password"
              name="new_password"
              value={form.new_password}
              onChange={handleChange}
              error={fieldErrors.new_password}
              show={show.new}
              onToggle={() => toggleShow("new")}
            />

            <PasswordInput
              label="Confirm New Password"
              name="confirm_password"
              value={form.confirm_password}
              onChange={handleChange}
              error={fieldErrors.confirm_password}
              show={show.confirm}
              onToggle={() => toggleShow("confirm")}
            />

            <button
              type="submit"
              disabled={loading || success}
              className="w-full bg-[#003580] text-white py-3 rounded-xl
                         flex items-center justify-center gap-2
                         hover:bg-[#002460] transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Spinner /> : "Set New Password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
