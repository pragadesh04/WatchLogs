import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTheme } from './ThemeProvider';
import { useSettingsStore, getGridCols } from '../stores/settingsStore';
import { useStatsStore } from '../stores/statsStore';
import { useAuthStore } from '../stores/authStore';
import { useToast } from './ToastProvider';
import { fetchWatchlist, fetchWatching, fetchCompleted, createSharedList } from '../services/api';

export default function Navbar() {
  const { theme, cycleTheme } = useTheme();
  const { gridSize, showImages, setGridSize, setShowImages } = useSettingsStore();
  const { stats, updateFromLists } = useStatsStore();
  const { showToast } = useToast();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [showMenu, setShowMenu] = useState(false);
  const [expandedSections, setExpandedSections] = useState({ stats: true, settings: false, share: false });
  const [shareLists, setShareLists] = useState({ watchlist: false, watching: false, completed: false });
  const [expiration, setExpiration] = useState(7);
  const [shareUrl, setShareUrl] = useState('');
  const [sharing, setSharing] = useState(false);
  const navigate = useNavigate();

  const toggleMenu = () => {
    setShowMenu(prev => !prev);
  };

  const closeMenu = () => {
    setShowMenu(false);
  };

  useEffect(() => {
    const handleClick = (e) => {
      if (showMenu && !e.target.closest('.more-menu') && !e.target.closest('.more-btn')) {
        closeMenu();
      }
    };
    
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [showMenu]);

  useEffect(() => {
    if (!isAuthenticated) return;
    
    const loadStats = async () => {
      try {
        const [watchlist, watching, completed] = await Promise.all([
          fetchWatchlist(),
          fetchWatching(),
          fetchCompleted(),
        ]);
        updateFromLists(watchlist.data || [], watching.data || [], completed.data || []);
      } catch (err) {
        console.error('Failed to load stats:', err);
      }
    };
    loadStats();
  }, [isAuthenticated, updateFromLists]);

  const cycleGridSize = () => {
    const sizes = ['small', 'medium', 'large'];
    const idx = sizes.indexOf(gridSize);
    setGridSize(sizes[(idx + 1) % sizes.length]);
  };

  const getThemeIcon = () => {
    if (theme === 'dark') {
      return (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 3a9 9 0 109 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 01-4.4 2.26 5.403 5.403 0 01-3.14-9.8c-.44-.06-.9-.1-1.36-.1z"/>
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1z"/>
      </svg>
    );
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 bg-[var(--bg-secondary)] border-t border-[var(--border-color)] z-40 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-4xl mx-auto flex justify-around py-3">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `flex flex-col items-center text-xs ${isActive ? 'text-[var(--accent-primary)]' : 'text-gray-500'}`
            }
          >
            <svg className="w-6 h-6 mb-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
            </svg>
            Home
          </NavLink>
          <NavLink
            to="/watchlist"
            className={({ isActive }) =>
              `flex flex-col items-center text-xs ${isActive ? 'text-[var(--accent-primary)]' : 'text-gray-500'}`
            }
          >
            <svg className="w-6 h-6 mb-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
            </svg>
            Watchlist
          </NavLink>
          <NavLink
            to="/watching"
            className={({ isActive }) =>
              `flex flex-col items-center text-xs ${isActive ? 'text-[var(--accent-primary)]' : 'text-gray-500'}`
            }
          >
            <svg className="w-6 h-6 mb-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
            Watching
          </NavLink>
          <NavLink
            to="/completed"
            className={({ isActive }) =>
              `flex flex-col items-center text-xs ${isActive ? 'text-[var(--accent-primary)]' : 'text-gray-500'}`
            }
          >
            <svg className="w-6 h-6 mb-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
            Completed
          </NavLink>
          
          {isAuthenticated ? (
            <button
              onClick={toggleMenu}
              className={`more-btn flex flex-col items-center text-xs ${showMenu ? 'text-[var(--accent-primary)]' : 'text-gray-500'} relative`}
            >
              <svg className="w-6 h-6 mb-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
              </svg>
              More
                {stats.totalWatched > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[var(--accent-primary)] text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                    {stats.totalWatched}
                  </span>
                )}
            </button>
          ) : (
              <NavLink
                to="/login"
                className={({ isActive }) =>
                  `flex flex-col items-center text-xs ${isActive ? 'text-[var(--accent-primary)]' : 'text-gray-500'}`
                }
              >
              <svg className="w-6 h-6 mb-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
              Login
            </NavLink>
          )}
        </div>
      </nav>

      {showMenu && isAuthenticated && (
        <div className="more-menu fixed bottom-16 right-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg shadow-lg p-4 z-50 w-72 max-h-[70vh] overflow-y-auto">
          <div className="mb-4 flex items-center justify-between">
            <span className="font-bold">{user?.email}</span>
              <button
                onClick={() => { logout(); closeMenu(); }}
                className="text-[var(--accent-primary)] text-sm hover:underline"
              >
              Logout
            </button>
          </div>

          <div className="mb-4">
            <button 
              onClick={() => setExpandedSections({ ...expandedSections, stats: !expandedSections.stats })}
              className="w-full flex items-center justify-between font-bold py-2"
            >
              <span>Your Stats</span>
              <svg className={`w-5 h-5 transition-transform ${expandedSections.stats ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 24 24">
                <path d="M7 10l5 5 5-5z"/>
              </svg>
            </button>
            {expandedSections.stats && (
              <div className="space-y-2 text-sm pl-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Watchlist</span>
                  <span className="font-medium">{stats.watchlist}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Watching</span>
                  <span className="font-medium">{stats.watching}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Completed</span>
                  <span className="font-medium">{stats.totalWatched}</span>
                </div>
                <hr className="my-2 border-[var(--border-color)]" />
                <div className="flex justify-between">
                  <span className="text-gray-400">This Month</span>
                  <span className="font-medium text-green-500">{stats.thisMonth}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">This Year</span>
                  <span className="font-medium text-green-500">{stats.thisYear}</span>
                </div>
              </div>
            )}
          </div>

          <div className="mb-4">
            <button 
              onClick={() => setExpandedSections({ ...expandedSections, settings: !expandedSections.settings })}
              className="w-full flex items-center justify-between font-bold py-2"
            >
              <span>Settings</span>
              <svg className={`w-5 h-5 transition-transform ${expandedSections.settings ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 24 24">
                <path d="M7 10l5 5 5-5z"/>
              </svg>
            </button>
            {expandedSections.settings && (
              <div className="space-y-3 pl-2">
                <button 
                  onClick={cycleGridSize}
                  className="w-full flex items-center justify-between text-sm py-1"
                >
                  <span>Grid Size</span>
                  <span className="text-gray-400 capitalize">{gridSize}</span>
                </button>
                <button 
                  onClick={cycleTheme}
                  className="w-full flex items-center justify-between text-sm py-1"
                >
                  <span>Theme</span>
                  <span className="text-gray-400 capitalize">{theme}</span>
                </button>
                <button 
                  onClick={() => setShowImages(!showImages)}
                  className="w-full flex items-center justify-between text-sm py-1"
                >
                  <span>Show Images</span>
                  <span className="text-gray-400">{showImages ? 'On' : 'Off'}</span>
                </button>
              </div>
            )}
          </div>

          <div>
            <button 
              onClick={() => setExpandedSections({ ...expandedSections, share: !expandedSections.share })}
              className="w-full flex items-center justify-between font-bold py-2"
            >
              <span>Share</span>
              <svg className={`w-5 h-5 transition-transform ${expandedSections.share ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 24 24">
                <path d="M7 10l5 5 5-5z"/>
              </svg>
            </button>
            {expandedSections.share && (
              <div className="pl-2">
                {!shareUrl ? (
                  <>
                    <div className="space-y-2 mb-4">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={shareLists.watchlist}
                          onChange={(e) => setShareLists({ ...shareLists, watchlist: e.target.checked })}
                          className="rounded"
                        />
                        Watchlist ({stats.watchlist})
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={shareLists.watching}
                          onChange={(e) => setShareLists({ ...shareLists, watching: e.target.checked })}
                          className="rounded"
                        />
                        Watching ({stats.watching})
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={shareLists.completed}
                          onChange={(e) => setShareLists({ ...shareLists, completed: e.target.checked })}
                          className="rounded"
                        />
                        Completed ({stats.totalWatched})
                      </label>
                    </div>
                    
                    <div className="mb-4">
                      <label className="text-sm text-gray-400 block mb-1">Expires in:</label>
                      <select
                        value={expiration}
                        onChange={(e) => setExpiration(parseInt(e.target.value))}
                        className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded text-sm"
                      >
                        <option value={null}>Never</option>
                        <option value={1}>1 day</option>
                        <option value={7}>7 days</option>
                        <option value={30}>30 days</option>
                      </select>
                    </div>
                    
                    <button
                      onClick={async () => {
                        const selectedLists = Object.entries(shareLists)
                          .filter(([_, v]) => v)
                          .map(([k]) => k);
                        
                        if (selectedLists.length === 0) {
                          showToast('Select at least one list to share', 'error');
                          return;
                        }
                        
                        setSharing(true);
                        try {
                          const res = await createSharedList(
                            selectedLists, 
                            expiration === null ? null : expiration
                          );
                          const code = res.data.code;
                          const url = `${window.location.origin}/shared/${code}`;
                          setShareUrl(url);
                          showToast('Share link created!', 'success');
                        } catch (err) {
                          showToast('Failed to create share link', 'error');
                        }
                        setSharing(false);
                      }}
                      disabled={sharing}
                      className="w-full py-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] rounded text-sm font-medium disabled:opacity-50"
                     >
                       {sharing ? 'Creating...' : 'Generate Link'}
                     </button>
                  </>
                ) : (
                  <>
                    <div className="mb-4">
                      <input
                        type="text"
                        value={shareUrl}
                        readOnly
                        className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded text-sm mb-2"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(shareUrl);
                          showToast('Copied to clipboard!', 'success');
                        }}
                      className="w-full py-2 bg-[var(--accent-secondary,green-600)] hover:opacity-90 rounded text-sm font-medium"
                     >
                        Copy Link
                      </button>
                    </div>
                    <button
                      onClick={() => {
                        setShareUrl('');
                        setShareLists({ watchlist: false, watching: false, completed: false });
                      }}
                      className="w-full py-2 bg-gray-600 hover:bg-gray-700 rounded text-sm font-medium"
                    >
                      Create New Link
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
