import { useNavigate } from 'react-router-dom';
import { Truck } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card border border-slate-800 p-8 rounded-2xl shadow-2xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-brand p-2 rounded-lg">
            <Truck className="text-white" size={24} />
          </div>
          <h1 className="text-2xl font-bold text-white uppercase tracking-tight">MargDarshan AI</h1>
        </div>
        <div className="space-y-4">
          <input type="email" placeholder="Email" className="w-full bg-slate-900 border border-slate-700 p-3 rounded-lg text-white focus:outline-none focus:border-brand" />
          <input type="password" placeholder="Password" className="w-full bg-slate-900 border border-slate-700 p-3 rounded-lg text-white focus:outline-none focus:border-brand" />
          <button 
            onClick={() => navigate('/dashboard')}
            className="w-full bg-brand hover:bg-blue-600 text-white font-bold py-3 rounded-lg transition-all"
          >
            Enter Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}