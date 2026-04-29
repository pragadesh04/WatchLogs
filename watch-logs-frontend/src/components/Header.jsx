import { Link } from 'react-router-dom';
import logo from '../assets/logo.svg';

export default function Header() {
  return (
    <header className="sticky top-0 left-0 right-0 z-50 transition-all duration-300">
      <div className="bg-[var(--bg-primary)]/80 backdrop-blur-md border-b border-[var(--border-color)] px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg overflow-hidden transition-transform group-hover:scale-110 shadow-lg">
              <img src={logo} alt="WatchLogs Logo" className="w-full h-full object-contain" />
            </div>
            <span className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
              Watch<span className="text-red-500">Logs</span>
            </span>
          </Link>
          
          <div className="flex items-center gap-4">
            {/* We can add quick search or user profile icon here later */}
          </div>
        </div>
      </div>
    </header>
  );
}
