import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import ToastProvider from './components/ToastProvider';
import ThemeProvider from './components/ThemeProvider';
import Home from './pages/Home';
import Watchlist from './pages/Watchlist';
import Watching from './pages/Watching';
import Completed from './pages/Completed';

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <div className="min-h-screen bg-[var(--bg-primary)]">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/watchlist" element={<Watchlist />} />
              <Route path="/watching" element={<Watching />} />
              <Route path="/completed" element={<Completed />} />
            </Routes>
            <Navbar />
          </div>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
