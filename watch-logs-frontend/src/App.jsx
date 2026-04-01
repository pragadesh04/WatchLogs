import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Watchlist from './pages/Watchlist';
import Watching from './pages/Watching';
import Completed from './pages/Completed';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#0f0f0f]">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/watchlist" element={<Watchlist />} />
          <Route path="/watching" element={<Watching />} />
          <Route path="/completed" element={<Completed />} />
        </Routes>
        <Navbar />
      </div>
    </BrowserRouter>
  );
}

export default App;
