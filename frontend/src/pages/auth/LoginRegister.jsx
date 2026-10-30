import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  Building2,
  Lock,
  Mail,
  User,
  GraduationCap,
  Calendar,
  Layers,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Shield,
  Sparkles,
  Info
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

// Safe helper to extract string error message from any backend response (prevents React object-as-child crashes)
const extractErrorMessage = (err, fallback = 'Operation failed. Please verify your details.') => {
  if (!err) return fallback;
  const detail = err.response?.data?.detail;
  if (!detail) return err.message || fallback;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map((d) => (typeof d === 'string' ? d : d.msg || JSON.stringify(d))).join(', ');
  }
  if (typeof detail === 'object') return detail.msg || JSON.stringify(detail);
  return String(detail);
};

export const LoginRegister = () => {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') === 'register' ? 'register' : 'login');
  const navigate = useNavigate();
  const { login, register, isAuthenticated, isAdmin } = useAuth();

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [fullName, setFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [enrollmentNumber, setEnrollmentNumber] = useState('');
  const [department, setDepartment] = useState('Computer Science & Engineering');
  const [course, setCourse] = useState('B.Tech Computer Science');
  const [year, setYear] = useState('3rd Year');
  const [regPassword, setRegPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      navigate(isAdmin ? '/admin/dashboard' : '/student/dashboard', { replace: true });
    }
  }, [isAuthenticated, isAdmin, navigate]);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanEmail = loginEmail.trim().toLowerCase();

    // Check college domain restriction
    if (cleanEmail.includes('@')) {
      if (!cleanEmail.endsWith('@st.niituniversity.in') && !cleanEmail.endsWith('@niituniversity.in')) {
        setError('Login is strictly restricted to email addresses ending with @st.niituniversity.in (or @niituniversity.in for administrators).');
        return;
      }
    }

    setLoading(true);
    try {
      const loggedUser = await login(cleanEmail, loginPassword);
      if (loggedUser.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/student/dashboard');
      }
    } catch (err) {
      setError(extractErrorMessage(err, 'Invalid email or password.'));
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanEmail = regEmail.trim().toLowerCase();

    // Enforce student domain constraint: MUST be @st.niituniversity.in
    if (!cleanEmail.endsWith('@st.niituniversity.in')) {
      setError('Student registration is strictly restricted to email addresses ending with @st.niituniversity.in');
      return;
    }

    if (regPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (regPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      const newUser = await register({
        full_name: fullName.trim(),
        email: cleanEmail,
        enrollment_number: enrollmentNumber.trim().toUpperCase(),
        department,
        course: course.trim(),
        year,
        password: regPassword,
        confirm_password: confirmPassword,
      });

      // Navigate to student dashboard
      navigate('/student/dashboard');
    } catch (err) {
      setError(extractErrorMessage(err, 'Registration failed. Check your inputs.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center gap-3 group mb-2">
          <div className="w-12 h-12 rounded-2xl bg-navy-900 text-white flex items-center justify-center shadow-lg shadow-navy-900/20 group-hover:bg-blue-600 transition-colors">
            <Building2 className="w-6 h-6" />
          </div>
        </Link>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Campus Resource Hub
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-slate-600">
          NIIT University Room & Facility Reservation System
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-xl rounded-2xl border border-slate-200">
          {/* Tabs */}
          <div className="flex border-b border-slate-200 mb-6">
            <button
              onClick={() => { setActiveTab('login'); setError(''); }}
              className={`flex-1 pb-3 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === 'login'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setActiveTab('register'); setError(''); }}
              className={`flex-1 pb-3 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === 'register'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Student Registration
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {activeTab === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Official Email or Enrollment ID
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="e.g. name@st.niituniversity.in or ID"
                    className="w-full pl-10 pr-3 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Must be an @st.niituniversity.in or @niituniversity.in account</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Password
                  </label>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-3 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-navy-900 hover:bg-blue-600 transition-colors shadow-md shadow-navy-900/10 disabled:opacity-50"
              >
                <span>{loading ? 'Authenticating...' : 'Sign In to Campus Hub'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Aarav Sharma"
                    className="w-full pl-10 pr-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Official Student Email <span className="text-[10px] text-blue-600 font-bold">(@st.niituniversity.in)</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="e.g. yourname@st.niituniversity.in"
                    className="w-full pl-10 pr-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Must strictly end with @st.niituniversity.in</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Enrollment No.
                  </label>
                  <input
                    type="text"
                    required
                    value={enrollmentNumber}
                    onChange={(e) => setEnrollmentNumber(e.target.value.toUpperCase())}
                    placeholder="NU2024CS089"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Year / Cohort
                  </label>
                  <select
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option>1st Year</option>
                    <option>2nd Year</option>
                    <option>3rd Year</option>
                    <option>4th Year</option>
                    <option>Postgraduate / PhD</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Department
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 truncate"
                  >
                    <option>Computer Science & Engineering</option>
                    <option>Electronics & Communication</option>
                    <option>Biotechnology & Bioinformatics</option>
                    <option>Management & Business</option>
                    <option>Humanities & Social Sciences</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Course Name
                  </label>
                  <input
                    type="text"
                    required
                    value={course}
                    onChange={(e) => setCourse(e.target.value)}
                    placeholder="B.Tech CSE"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Min 6 chars"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-md shadow-blue-600/20 disabled:opacity-50"
              >
                <span>{loading ? 'Creating Student Account...' : 'Complete Registration'}</span>
                <CheckCircle2 className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Teacher / Evaluator Information Box (Static Read-Only, No Action Buttons) */}
          <div className="mt-6 pt-5 border-t border-slate-100 space-y-2 text-xs">
            <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-blue-600" />
              Teacher & Evaluator Test Accounts:
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2.5 text-[11px] text-slate-600">
              <div>
                <span className="font-semibold text-slate-900 block">Student Portal Test Account:</span>
                <p className="text-slate-700">Email: <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-blue-700 font-mono font-bold select-all">tanmay.sharma@st.niituniversity.in</code></p>
                <p className="text-slate-700 mt-0.5">Password: <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-800 font-mono select-all">StudentPassword123!</code></p>
              </div>
              <div className="pt-2 border-t border-slate-200/60">
                <span className="font-semibold text-slate-900 block">Administrator Portal Test Account:</span>
                <p className="text-slate-700">Email: <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-amber-700 font-mono font-bold select-all">admin@niituniversity.in</code></p>
                <p className="text-slate-700 mt-0.5">Password: <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-800 font-mono select-all">AdminPassword123!</code></p>
              </div>
            </div>
            <p className="text-[10px] text-slate-400">
              *All new student accounts must end with @st.niituniversity.in
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
