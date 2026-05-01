import { Link } from 'react-router-dom';
import logo from '../assets/logo.svg';
import UniverseSwitcher from './UniverseSwitcher';

export default function Header() {
  return (
    <header className="sticky top-0 left-0 right-0 z-50 glass noise-overlay">
      <div className="relative z-10 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg overflow-hidden transition-transform duration-300 group-hover:scale-110 shadow-lg">
              <img src={logo} alt="WatchLogs Logo" className="w-full h-full object-contain" />
            </div>
            <span className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
              Watch<span className="text-[var(--accent-primary)]">Logs</span>
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <UniverseSwitcher />
          </div>
        </div>
      </div>
    </header>
  );
}
