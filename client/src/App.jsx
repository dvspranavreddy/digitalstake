import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Subscription from './pages/Subscription';
import Scores from './pages/Scores';
import Charities from './pages/Charities';
import Winnings from './pages/Winnings';
import Admin from './pages/Admin';
import HowItWorks from './pages/HowItWorks';
import Profile from './pages/Profile';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="app">
          <Navbar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/charities" element={<Charities />} />
              <Route path="/mechanics" element={<HowItWorks />} />
              <Route path="/subscription" element={<Subscription />} />
              <Route path="/dashboard" element={
                <ProtectedRoute><Home /></ProtectedRoute>
              } />
              <Route path="/scores" element={
                <ProtectedRoute><Scores /></ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute><Profile /></ProtectedRoute>
              } />
              <Route path="/winnings" element={
                <ProtectedRoute><Winnings /></ProtectedRoute>
              } />
              <Route path="/admin" element={
                <ProtectedRoute adminOnly><Admin /></ProtectedRoute>
              } />
            </Routes>
          </main>
          <Footer />
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
