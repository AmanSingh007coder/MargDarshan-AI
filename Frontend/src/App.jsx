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
    <div className="flex min-h-screen bg-[#020617] text-white font-sans">
      <aside className="w-64 border-r border-white/5 bg-[#050810] flex flex-col fixed h-full z-50">
        <div className="p-8 flex items-center gap-3">
          <span className="font-black text-white uppercase italic tracking-tighter text-xl">MargDarshan</span>
        </div>
        <nav className="flex-1 px-4 space-y-1">
          {navItems.map(item => (
            <Link key={item.path} to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
                location.pathname === item.path || location.pathname.startsWith(item.path + '/')
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                  : 'text-slate-500 hover:text-white hover:bg-white/5'
              }`}>
              <item.icon size={16} />{item.label}
            </Link>
          ))}
        </nav>
        <div className="p-6 border-t border-white/5">
          <Link to="/" className="flex items-center gap-3 px-4 py-3 text-[10px] font-black text-slate-500 hover:text-red-500 transition uppercase tracking-widest">
            <LogOut size={16} /> Logout
          </Link>
        </div>
      </aside>

      <main className="flex-1 ml-64 min-h-screen">
        <header className="h-16 border-b border-white/5 flex items-center px-10 bg-[#020617]/50 backdrop-blur-xl sticky top-0 z-40">
          <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> System Status: Operational
          </div>
        </header>
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
