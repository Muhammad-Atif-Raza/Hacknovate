import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Hash, GraduationCap, Eye, EyeOff, Building2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from '@/contexts/NotificationContext';
import { Button } from '@/components/ui';

const departments = [
  'Computer Science',
  'Information Technology',
  'Electronics',
  'Mechanical',
  'Civil',
  'Electrical',
  'Other',
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { showSuccess, showError } = useNotification();

  const [form, setForm] = useState({
    name: '',
    email: '',
    enrollmentNumber: '',
    department: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Full name is required';
    if (!form.email.trim()) {
      errs.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = 'Enter a valid email address';
    }
    if (!form.enrollmentNumber.trim()) errs.enrollmentNumber = 'Enrollment number is required';
    if (!form.department) errs.department = 'Department is required';
    if (!form.password) {
      errs.password = 'Password is required';
    } else if (form.password.length < 6) {
      errs.password = 'Password must be at least 6 characters';
    }
    if (!form.confirmPassword) {
      errs.confirmPassword = 'Please confirm your password';
    } else if (form.password !== form.confirmPassword) {
      errs.confirmPassword = 'Passwords do not match';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const { confirmPassword, ...payload } = form;
      await register(payload);
      showSuccess('Account created successfully!');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      showError(err?.response?.data?.message || err?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = (field) =>
    `w-full rounded-lg border bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-sky-500 focus:ring-1 focus:ring-sky-500 ${
      errors[field] ? 'border-red-500' : 'border-white/10'
    }`;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 py-10">
      <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-sky-500/10 blur-3xl" />
      <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-teal-500/10 blur-3xl" />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500 shadow-lg shadow-sky-500/30">
            <GraduationCap className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Smart Campus</h1>
          <p className="mt-1 text-sm text-gray-400">Create your account</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-xl backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="John Doe"
                  className={inputCls('name')}
                />
              </div>
              {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@university.edu"
                  className={inputCls('email')}
                />
              </div>
              {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email}</p>}
            </div>

            {/* Enrollment Number */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">Enrollment Number</label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  name="enrollmentNumber"
                  value={form.enrollmentNumber}
                  onChange={handleChange}
                  placeholder="EN2024001"
                  className={inputCls('enrollmentNumber')}
                />
              </div>
              {errors.enrollmentNumber && (
                <p className="mt-1 text-xs text-red-400">{errors.enrollmentNumber}</p>
              )}
            </div>

            {/* Department */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">Department</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <select
                  name="department"
                  value={form.department}
                  onChange={handleChange}
                  className={`w-full appearance-none rounded-lg border bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white outline-none transition-colors focus:border-sky-500 focus:ring-1 focus:ring-sky-500 ${
                    !form.department ? 'text-gray-500' : 'text-white'
                  } ${errors.department ? 'border-red-500' : 'border-white/10'}`}
                >
                  <option value="" className="bg-slate-800">Select Department</option>
                  {departments.map((d) => (
                    <option key={d} value={d} className="bg-slate-800">
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              {errors.department && <p className="mt-1 text-xs text-red-400">{errors.department}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Min 6 characters"
                  className={`w-full rounded-lg border bg-white/5 py-2.5 pl-10 pr-10 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-sky-500 focus:ring-1 focus:ring-sky-500 ${
                    errors.password ? 'border-red-500' : 'border-white/10'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password}</p>}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <input
                  type={showConfirm ? 'text' : 'password'}
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="Re-enter password"
                  className={`w-full rounded-lg border bg-white/5 py-2.5 pl-10 pr-10 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-sky-500 focus:ring-1 focus:ring-sky-500 ${
                    errors.confirmPassword ? 'border-red-500' : 'border-white/10'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-red-400">{errors.confirmPassword}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-sky-500 py-2.5 text-white hover:bg-sky-600 disabled:opacity-60 mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Creating account...
                </span>
              ) : (
                'Create Account'
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-400">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-sky-400 hover:text-sky-300 transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
