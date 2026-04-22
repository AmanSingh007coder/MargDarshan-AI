import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import Landing           from './pages/Landing';
import Register          from './pages/Register';
import Login             from './pages/Login';
import AuthCallback      from './pages/AuthCallback';
import Dashboard         from './pages/Dashboard';
import LiveMap           from './pages/LiveMap';
import MyShipments       from './pages/Myshipments';
import NewShipment       from './pages/Newshipment';
import Tracker           from './pages/Tracker';
import MfaEnroll         from './pages/MfaEnroll';
import TotpChallenge     from './pages/TotpChallenge';
import SecurityDashboard from './pages/SecurityDashboard';
import {
  LayoutDashboard, Map as MapIcon,
  Truck, PlusSquare, Zap, LogOut, Shield,
} from 'lucide-react';

function DashboardLayout({ children }) {
  const location = useLocation();
  const navItems = [
    { icon: LayoutDashboard, label: 'Overview',      path: '/dashboard' },
    { icon: MapIcon,         label: 'Live Map',       path: '/dashboard/map' },
    { icon: Truck,           label: 'My Shipments',   path: '/dashboard/shipments' },
    { icon: PlusSquare,      label: 'New Shipment',   path: '/dashboard/new-shipment' },
    { icon: Zap,             label: 'Simulate',       path: '/simulate' },
    { icon: Shield,          label: 'Security',       path: '/dashboard/security' },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#020617] text-white font-sans">
      <header className="border-b border-white/5 bg-[#050810] sticky top-0 z-50 backdrop-blur-xl">
        <div className="px-10 py-6 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <span className="font-black text-white uppercase italic tracking-tighter text-xl">MargDarshan-AI</span>
            <nav className="flex items-center gap-6 border-l border-white/5 pl-8">
              {navItems.map(item => (
                <Link key={item.path} to={item.path}
                  className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all py-2 px-3 rounded-lg ${
                    location.pathname === item.path || location.pathname.startsWith(item.path + '/')
                      ? 'text-blue-400 bg-blue-500/10 border border-blue-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}>
                  <item.icon size={14} />{item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2 px-3 py-2 text-[10px] font-black text-slate-400 hover:text-red-500 transition uppercase tracking-widest rounded-lg hover:bg-red-500/10">
              <LogOut size={14} /> Logout
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-screen">
        <section className="p-8">{children}</section>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/"              element={<Landing />} />
      <Route path="/register"      element={<Register />} />
      <Route path="/login"         element={<Login />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/mfa"           element={<TotpChallenge />} />
      <Route path="/mfa/enroll"    element={<MfaEnroll />} />

      <Route path="/dashboard"              element={<DashboardLayout><Dashboard /></DashboardLayout>} />
      <Route path="/dashboard/map"          element={<DashboardLayout><LiveMap /></DashboardLayout>} />
      <Route path="/dashboard/shipments"    element={<DashboardLayout><MyShipments /></DashboardLayout>} />
      <Route path="/dashboard/new-shipment" element={<DashboardLayout><NewShipment /></DashboardLayout>} />
      <Route path="/dashboard/security"     element={<DashboardLayout><SecurityDashboard /></DashboardLayout>} />

      {/* Simulate (formerly Tracker) */}
      <Route path="/simulate"               element={<DashboardLayout><Tracker /></DashboardLayout>} />
      <Route path="/simulate/:shipmentId"   element={<DashboardLayout><Tracker /></DashboardLayout>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
