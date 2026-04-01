import { NavLink } from 'react-router-dom';

export default function Navbar() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 z-40">
      <div className="max-w-4xl mx-auto flex justify-around py-3">
        <NavLink 
          to="/" 
          className={({ isActive }) => 
            `flex flex-col items-center text-xs ${isActive ? 'text-red-500' : 'text-gray-500'}`
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
            `flex flex-col items-center text-xs ${isActive ? 'text-red-500' : 'text-gray-500'}`
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
            `flex flex-col items-center text-xs ${isActive ? 'text-red-500' : 'text-gray-500'}`
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
            `flex flex-col items-center text-xs ${isActive ? 'text-red-500' : 'text-gray-500'}`
          }
        >
          <svg className="w-6 h-6 mb-1" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
          </svg>
          Completed
        </NavLink>
      </div>
    </nav>
  );
}
