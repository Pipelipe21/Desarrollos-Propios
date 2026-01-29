import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Loader2, KeyRound, User, ArrowRight } from 'lucide-react';

const Login: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    // Simulate smoother UX
    await new Promise(resolve => setTimeout(resolve, 800));

    const result = await login(username, password);
    
    if (!result.success) {
      setError(result.message || 'Credenciales inválidas');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 overflow-hidden relative">
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-200 rounded-full mix-blend-multiply filter blur-2xl opacity-30 animate-blob"></div>
        <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-pink-200 rounded-full mix-blend-multiply filter blur-2xl opacity-30 animate-blob animation-delay-2000"></div>

        <div className="p-10 relative z-10">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-700 tracking-tight mb-2">
              D&D
            </h1>
            <p className="text-sm font-medium text-slate-400 uppercase tracking-widest">
              Industries Portal
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="username" className="text-xs font-bold text-slate-500 uppercase ml-1">
                Identificador
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-400 group-focus-within:text-purple-500 transition-colors" />
                </div>
                <input
                  id="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-11 pr-4 py-4 bg-slate-50 border-0 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-purple-500/50 focus:bg-white transition-all shadow-inner"
                  placeholder="Usuario asignado"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-xs font-bold text-slate-500 uppercase ml-1">
                Clave de Acceso
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <KeyRound className="h-5 w-5 text-slate-400 group-focus-within:text-purple-500 transition-colors" />
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-11 pr-4 py-4 bg-slate-50 border-0 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-purple-500/50 focus:bg-white transition-all shadow-inner"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="animate-in fade-in slide-in-from-top-2 bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-medium flex items-center gap-2 border border-red-100">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 px-6 rounded-2xl shadow-lg shadow-purple-500/30 text-white font-bold text-lg bg-gradient-to-r from-slate-900 to-slate-800 hover:to-slate-700 active:scale-[0.98] transition-all flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-4"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5" />
                  <span className="text-sm">Verificando...</span>
                </>
              ) : (
                <>
                  Ingresar <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-xs text-slate-400">
              Acceso restringido. Versión PWA v2.1
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
