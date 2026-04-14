import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { useToast } from '../components/ToastProvider';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();
  const authLogin = useAuthStore((state) => state.login);
  const { showToast } = useToast();

  const validatePassword = (pwd) => {
    const errs = {};
    if (pwd.length < 8) errs.password = 'Password must be at least 8 characters';
    if (!/[A-Za-z]/.test(pwd)) errs.password = 'Password must contain at least one letter';
    if (!/\d/.test(pwd)) errs.password = 'Password must contain at least one number';
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)) errs.password = 'Password must contain at least one symbol';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    const pwdErrors = validatePassword(password);
    if (Object.keys(pwdErrors).length > 0) {
      setErrors(pwdErrors);
      return;
    }

    if (password !== confirmPassword) {
      setErrors({ confirm: 'Passwords do not match' });
      return;
    }

    setLoading(true);

    try {
      const res = await register(email, password);
      const { access_token, refresh_token, user } = res.data;
      authLogin(user, access_token, refresh_token);
      showToast('Registration successful!', 'success');
      navigate('/');
    } catch (err) {
      showToast(err.response?.data?.detail || 'Registration failed', 'error');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-8">Create Account</h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-white"
              placeholder="Enter your email"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-white"
              placeholder="Min 8 chars, 1 letter, 1 number, 1 symbol"
              required
            />
            {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-white"
              placeholder="Confirm your password"
              required
            />
            {errors.confirm && <p className="text-red-500 text-sm mt-1">{errors.confirm}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-red-600 hover:bg-red-700 rounded-lg font-medium disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>

        <p className="text-center text-gray-400 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-red-500 hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}