import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Navbar from './components/Navbar';
import ToastProvider from './components/ToastProvider';
import ThemeProvider from './components/ThemeProvider';
import UniverseTransition from './components/UniverseTransition';
import Home from './pages/Home';
import Watchlist from './pages/Watchlist';
import Watching from './pages/Watching';
import Completed from './pages/Completed';
import Login from './pages/Login';
import Register from './pages/Register';
import SharedList from './pages/SharedList';
import MovieInfo from './pages/MovieInfo';
import { useAuthStore } from './stores/authStore';
import { useUniverseStore } from './stores/universeStore';

function ProtectedRoute({ children }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function PublicOnlyRoute({ children }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function App() {
  const universe = useUniverseStore((state) => state.universe);

  useEffect(() => {
    document.documentElement.setAttribute('data-universe', universe);
  }, [universe]);

  return (
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <UniverseTransition />
          <div className="min-h-screen bg-[var(--bg-primary)] pb-16">
            <Header />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
              <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />
              <Route path="/shared/:code" element={<SharedList />} />
              <Route 
                path="/watchlist" 
                element={<ProtectedRoute><Watchlist /></ProtectedRoute>} 
              />
              <Route 
                path="/watching" 
                element={<ProtectedRoute><Watching /></ProtectedRoute>} 
              />
              <Route 
                path="/completed" 
                element={<ProtectedRoute><Completed /></ProtectedRoute>} 
              />
              <Route 
                path="/info/:id" 
                element={<MovieInfo />} 
              />
            </Routes>
          </div>
          <Navbar />
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;