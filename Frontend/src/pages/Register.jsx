import { useNavigate } from 'react-router-dom';
import { Truck } from 'lucide-react';

export default function Register() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card border border-slate-800 p-8 rounded-2xl">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <Truck className="text-brand" size={32} />
          <h1 className="text-2xl font-bold text-white tracking-tight uppercase">Join MargDarshan</h1>
        </div>
        <div className="space-y-4">
          <input type="text" placeholder="Full Name" className="w-full bg-slate-900 border border-slate-700 p-3 rounded-lg text-white focus:border-brand" />
          <input type="email" placeholder="Email" className="w-full bg-slate-900 border border-slate-700 p-3 rounded-lg text-white focus:border-brand" />
          <input type="password" placeholder="Password" className="w-full bg-slate-900 border border-slate-700 p-3 rounded-lg text-white focus:border-brand" />
          <button className="w-full bg-brand py-3 rounded-lg text-white font-bold hover:bg-blue-600 transition">
            Create Account
          </button>
          <p className="text-center text-slate-500 text-sm mt-4">
            Already have an account? <span onClick={() => navigate('/login')} className="text-brand cursor-pointer hover:underline">Login</span>
          </p>
        </div>
      </div>
    </div>
  );
}