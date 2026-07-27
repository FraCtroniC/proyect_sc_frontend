import { useState, useEffect, FormEvent } from 'react';
import { motion } from 'motion/react';
import { 
  Lock, 
  User as UserIcon, 
  LogIn, 
  AlertCircle, 
  ShieldCheck, 
  Eye, 
  EyeOff,
  UserCheck,
  Mail,
  ArrowLeft,
  CheckCircle2,
  KeyRound
} from 'lucide-react';
import { User, UserRole } from '../types';

const BACKEND_URL = import.meta.env.PROD ? (import.meta.env.VITE_BACKEND_URL || '') : '';

interface LoginScreenProps {
  users: User[];
  onLogin: (user: User) => void;
}

export default function LoginScreen({ users, onLogin }: LoginScreenProps) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);

  // Password reset from URL token
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      setResetToken(token);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);



  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'super_admin':
        return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
      case 'control_estudios':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'docente':
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'super_admin':
        return 'Director';
      case 'control_estudios':
        return 'Ctrl Estudios';
      case 'docente':
        return 'Docente / Profesor';
      default:
        return 'Usuario';
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!identifier.trim()) {
      setError('Por favor, introduzca su Usuario o Correo Electrónico.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(BACKEND_URL + '/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: identifier.trim(), password }),
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        setError(data.message || 'Usuario o contraseña incorrectos.');
        setIsLoading(false);
        return;
      }

      // Guardar sesión compatible con logica anterior
      sessionStorage.setItem('liceo-auth-session', JSON.stringify({
        userName: data.user.userName,
        displayName: data.user.displayName,
        expiresAt: Date.now() + 8 * 60 * 60 * 1000, // 8 horas
        sessionToken: data.token,
      }));

      // Mapear rol del backend al rol esperado en el frontend_new
      let mappedRole: UserRole = 'docente';
      const backendRol = (data.user.rol || '').toLowerCase();
      if (backendRol.includes('director') || backendRol.includes('admin')) {
        mappedRole = 'super_admin';
      } else if (backendRol.includes('control')) {
        mappedRole = 'control_estudios';
      } else if (backendRol.includes('coordinador')) {
        mappedRole = 'coordinador';
      } else if (backendRol.includes('docente') || backendRol.includes('profesor')) {
        mappedRole = 'docente';
      }

      const loggedUser: User = {
        id: data.user.userName, // backend no siempre expone id, usamos userName temporalmente
        name: data.user.displayName,
        email: identifier.trim(),
        role: mappedRole,
        active: true,
        username: data.user.userName,
      };

      onLogin(loggedUser);
    } catch (err) {
      console.error('Error durante el inicio de sesión:', err);
      setError('No se pudo conectar con el servidor. Verifique su conexión.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!newPassword.trim()) {
      setError('Por favor, introduzca la nueva contraseña.');
      return;
    }

    if (newPassword.trim().length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (newPassword.trim() !== confirmPassword.trim()) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(BACKEND_URL + '/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, password: newPassword.trim() }),
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        setError(data.error?.message || data.message || 'No se pudo restablecer la contraseña.');
        setIsLoading(false);
        return;
      }

      setResetSuccess(true);
    } catch {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setResetSent(false);

    if (!resetEmail.trim()) {
      setError('Por favor, introduzca su correo electrónico.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(BACKEND_URL + '/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: resetEmail.trim() }),
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error?.message || 'No se pudo enviar el correo de recuperación.');
        setIsLoading(false);
        return;
      }

      setResetSent(true);
    } catch {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="login-container" className="min-h-screen bg-slate-900 flex flex-col justify-center items-center py-10 px-4 select-none relative overflow-hidden">
      
      {/* Background decorations matching sovereign theme */}
      <div id="glow-1" className="absolute -left-16 -top-16 h-80 w-80 rounded-full bg-blue-600/10 blur-3xl"></div>
      <div id="glow-2" className="absolute -right-16 -bottom-16 h-80 w-80 rounded-full bg-emerald-600/10 blur-3xl"></div>

      <motion.div 
        id="login-card-wrapper"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md md:max-w-lg 2xl:max-w-xl bg-slate-800/80 border border-slate-700/60 backdrop-blur-md rounded-2xl shadow-2xl p-6 md:p-10 2xl:p-12 space-y-6 2xl:space-y-8 relative z-10"
      >
        {/* Sovereign Header Band */}
        <div id="sovereign-header-badge" className="flex justify-center items-center gap-1.5 opacity-85">
          <span className="h-1 w-8 bg-yellow-400 rounded-full animate-pulse"></span>
          <span className="h-1 w-8 bg-blue-500 rounded-full"></span>
          <span className="h-1 w-8 bg-red-500 rounded-full"></span>
        </div>

        {/* Brand & Emblem */}
        <div id="login-brand" className="text-center space-y-2 2xl:space-y-4">
          <div className="mx-auto h-20 w-20 2xl:h-24 2xl:w-24 bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-slate-900/40 border-2 border-slate-400 overflow-hidden p-1.5 relative group">
            <div className="absolute inset-0 bg-slate-500/10 group-hover:bg-transparent transition-colors z-10 pointer-events-none"></div>
            <img src="./logo_app.png" alt="Logo Sistema" className="h-full w-full object-contain relative z-0" />
          </div>
          <div>
            <h1 className="text-white font-black text-lg md:text-xl 2xl:text-2xl tracking-widest uppercase block leading-tight">
              L. N. E. O.
            </h1>
            <span className="text-sm md:text-base 2xl:text-lg text-slate-400 font-bold uppercase tracking-wider block mt-1">
              Liceo Nacional Estilita Orozco
            </span>
          </div>
          <p className="text-sm md:text-base 2xl:text-lg text-slate-500 leading-normal max-w-xs md:max-w-sm 2xl:max-w-md mx-auto">
            Sistema Integrado de Gestión Academica, Control de notas y Asistencia de Educacion Media General.
          </p>
        </div>

        {resetToken ? (
          resetSuccess ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm rounded-xl space-y-3"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                <span className="font-bold">Contraseña actualizada</span>
              </div>
              <p className="leading-relaxed text-slate-300">
                Tu contraseña ha sido cambiada exitosamente. Ya puedes iniciar sesión con la nueva contraseña.
              </p>
              <button
                onClick={() => { setResetToken(null); window.location.href = '/'; }}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-all pointer-events-auto cursor-pointer flex items-center justify-center gap-1.5"
              >
                <LogIn className="h-4 w-4" />
                <span>Iniciar Sesión</span>
              </button>
            </motion.div>
          ) : (
            <form id="reset-password-form" onSubmit={handleResetPassword} className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-700/60">
                <KeyRound className="h-4 w-4 text-blue-400" />
                <h3 className="text-base font-bold text-white">Nueva Contraseña</h3>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm rounded-xl flex items-start gap-2"
                >
                  <AlertCircle className="h-4.5 w-4.5 text-rose-400 shrink-0 mt-0.5" />
                  <span className="font-semibold leading-relaxed">{error}</span>
                </motion.div>
              )}

              <p className="text-sm text-slate-400 leading-relaxed">
                Introduzca su nueva contraseña. El enlace es válido por 1 hora.
              </p>

              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-bold uppercase tracking-wider block">
                  Nueva Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full text-sm pl-10 pr-10 py-2.5 bg-slate-900/60 border border-slate-700/80 rounded-xl text-slate-200 placeholder-slate-550 focus:outline-hidden focus:border-blue-500 focus:bg-slate-900 transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300 pointer-events-auto cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-bold uppercase tracking-wider block">
                  Confirmar Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita la contraseña"
                    className="w-full text-sm pl-10 pr-3.5 py-2.5 bg-slate-900/60 border border-slate-700/80 rounded-xl text-slate-200 placeholder-slate-550 focus:outline-hidden focus:border-blue-500 focus:bg-slate-900 transition-all font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                aria-busy={isLoading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-900/30 transition-all pointer-events-auto cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-60"
              >
                {isLoading ? (
                  <span className="h-4 w-4 border-2 border-white/35 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <>
                    <KeyRound className="h-4 w-4" />
                    <span>Restablecer Contraseña</span>
                  </>
                )}
              </button>
            </form>
          )
        ) : showForgotPassword ? (
          <form id="forgot-password-form" onSubmit={handleForgotPassword} className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-700/60">
              <button
                type="button"
                onClick={() => { setShowForgotPassword(false); setError(null); setResetSent(false); }}
                className="text-slate-400 hover:text-white pointer-events-auto cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <h3 className="text-base font-bold text-white">Recuperar Contraseña</h3>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm rounded-xl flex items-start gap-2"
              >
                <AlertCircle className="h-4.5 w-4.5 text-rose-400 shrink-0 mt-0.5" />
                <span className="font-semibold leading-relaxed">{error}</span>
              </motion.div>
            )}

            {resetSent ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm rounded-xl space-y-2"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  <span className="font-bold">Correo enviado</span>
                </div>
                <p className="leading-relaxed text-slate-300">
                  Si el correo está registrado, recibirá un enlace para restablecer su contraseña. Revise su bandeja de entrada y carpeta de spam.
                </p>
              </motion.div>
            ) : (
              <>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Introduzca su correo electrónico registrado y le enviaremos un enlace para restablecer su contraseña.
                </p>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-bold uppercase tracking-wider block">
                    Correo Electrónico
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="ej: director@liceo.edu.ve"
                      className="w-full text-sm pl-10 pr-3.5 py-2.5 bg-slate-900/60 border border-slate-700/80 rounded-xl text-slate-200 placeholder-slate-550 focus:outline-hidden focus:border-blue-500 focus:bg-slate-900 transition-all font-semibold"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  aria-busy={isLoading}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-900/30 transition-all pointer-events-auto cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-60"
                >
                  {isLoading ? (
                    <span className="h-4 w-4 border-2 border-white/35 border-t-white rounded-full animate-spin"></span>
                  ) : (
                    <>
                      <Mail className="h-4 w-4" />
                      <span>Enviar Enlace de Recuperación</span>
                    </>
                  )}
                </button>
              </>
            )}
          </form>
        ) : (
          <form id="login-form" onSubmit={handleSubmit} className="space-y-4">
            
            {error && (
              <motion.div 
                id="login-error-alert"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm rounded-xl flex items-start gap-2"
              >
                <AlertCircle className="h-4.5 w-4.5 text-rose-400 shrink-0 mt-0.5" />
                <span className="font-semibold leading-relaxed">{error}</span>
              </motion.div>
            )}

            <div className="space-y-1 2xl:space-y-2">
              <label className="text-sm 2xl:text-base text-slate-400 font-bold uppercase tracking-wider block">
                Usuario o correo electrónico 
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3.5 2xl:left-4 top-3 2xl:top-3.5 h-4 w-4 2xl:h-5 2xl:w-5 text-slate-500" />
                <input
                  id="login-username-input"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Ej: Usuario o usuario@dominio.com"
                  className="w-full text-base 2xl:text-lg pl-10 2xl:pl-12 pr-3.5 py-2.5 2xl:py-3.5 bg-slate-900/60 border border-slate-700/80 rounded-xl text-slate-200 placeholder-slate-550 focus:outline-hidden focus:border-blue-500 focus:bg-slate-900 transition-all font-semibold"
                />
              </div>
            </div>

            <div className="space-y-1 2xl:space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm 2xl:text-base text-slate-400 font-bold uppercase tracking-wider block">
                  Contraseña
                </label>
                <button
                  type="button"
                  onClick={() => { setShowForgotPassword(true); setError(null); }}
                  className="text-sm 2xl:text-base text-blue-400 hover:text-blue-300 font-bold pointer-events-auto cursor-pointer"
                >
                  ¿Olvidó su contraseña?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 2xl:left-4 top-3 2xl:top-3.5 h-4 w-4 2xl:h-5 2xl:w-5 text-slate-500" />
                <input
                  id="login-password-input"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full text-base 2xl:text-lg pl-10 2xl:pl-12 pr-10 py-2.5 2xl:py-3.5 bg-slate-900/60 border border-slate-700/80 rounded-xl text-slate-200 placeholder-slate-550 focus:outline-hidden focus:border-blue-500 focus:bg-slate-900 transition-all font-mono"
                />
                <button
                  type="button"
                  id="btn-toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 2xl:right-4 top-3 2xl:top-3.5 text-slate-500 hover:text-slate-300 pointer-events-auto cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4 2xl:h-5 2xl:w-5" /> : <Eye className="h-4 w-4 2xl:h-5 2xl:w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              id="btn-submit-login"
              disabled={isLoading}
              aria-busy={isLoading}
              className="w-full py-3 2xl:py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-base 2xl:text-lg rounded-xl shadow-lg shadow-blue-900/30 transition-all pointer-events-auto cursor-pointer flex items-center justify-center gap-1.5 2xl:gap-2 disabled:opacity-60 disabled:cursor-not-allowed mt-2 2xl:mt-4"
            >
              {isLoading ? (
                <span className="h-4 w-4 2xl:h-5 2xl:w-5 border-2 border-white/35 border-t-white rounded-full animate-spin"></span>
              ) : (
                <>
                  <LogIn className="h-4 w-4 2xl:h-5 2xl:w-5" />
                  <span>Iniciar Sesión en el Panel</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer info lock indicator */}
        <div id="login-footer-security" className="text-center pt-2 mt-4">
          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-500 tracking-wider uppercase bg-emerald-500/10 border border-emerald-500/10 px-3 py-1.5 rounded-full">
            <ShieldCheck className="h-3 w-3" /> Conexión Segura al Servidor Institucional
          </span>
        </div>
      </motion.div>
    </div>
  );
}
