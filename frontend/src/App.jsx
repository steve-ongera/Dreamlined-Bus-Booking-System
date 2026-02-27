import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import './global.css';

import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Results from './pages/Results';
import About from './pages/About';
import TrackTicket from './pages/TrackTicket';
import Contact from './pages/Contact';
import Careers from './pages/Careers';
import AboutDreamline from './pages/AboutDreamline';
import AdminApp from './admin/AdminApp';
 
 

// Scroll to top on route change
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

export default function App() {
  return (
    <Router>
      <ScrollToTop />
      <div className="d-flex flex-column min-vh-100">
        <Navbar />
        <main className="flex-grow-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/results" element={<Results />} />
            <Route path="/about" element={<About />} />
            <Route path="/about-dreamline" element={<AboutDreamline />} />
            <Route path="/track" element={<TrackTicket />} />
            <Route path="/track/:reference" element={<TrackTicket />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/careers" element={<Careers />} />
            <Route path="/admin-panel/*" element={<AdminApp />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}