import { io } from 'socket.io-client';
import { useEffect, useRef } from 'react';

function getSessionToken(): string | null {
  try {
    const raw = sessionStorage.getItem('liceo-auth-session');
    if (raw) return JSON.parse(raw).sessionToken || null;
  } catch { /* ignore */ }
  return null;
}

export function useSocket(isLoggedIn: boolean, onEvent: (event: string, data: any) => void) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!isLoggedIn) return;

    const token = getSessionToken();
    if (!token) return;

    const BACKEND_URL = import.meta.env.PROD ? (import.meta.env.VITE_BACKEND_URL || '') : '';
    const backendUrl = BACKEND_URL || '/';

    const socket = io(backendUrl, {
      auth: { token },
      transports: ['polling', 'websocket'],
    });

    socket.on('connect', () => console.log('[WS] Conectado'));
    socket.on('connect_error', (err) => console.error('[WS] Error de conexión:', err.message));

    socket.on('periodo:create', (d) => onEventRef.current('periodo:create', d));
    socket.on('periodo:update', (d) => onEventRef.current('periodo:update', d));
    socket.on('periodo:delete', (d) => onEventRef.current('periodo:delete', d));

    socket.on('usuario:create', (d) => onEventRef.current('usuario:create', d));
    socket.on('usuario:update', (d) => onEventRef.current('usuario:update', d));
    socket.on('usuario:delete', (d) => onEventRef.current('usuario:delete', d));

    socket.on('aula:create', (d) => onEventRef.current('aula:create', d));
    socket.on('aula:update', (d) => onEventRef.current('aula:update', d));
    socket.on('aula:delete', (d) => onEventRef.current('aula:delete', d));

    socket.on('plan-estudio:create', (d) => onEventRef.current('plan-estudio:create', d));
    socket.on('plan-estudio:update', (d) => onEventRef.current('plan-estudio:update', d));
    socket.on('plan-estudio:delete', (d) => onEventRef.current('plan-estudio:delete', d));

    socket.on('docente:create', (d) => onEventRef.current('docente:create', d));
    socket.on('docente:update', (d) => onEventRef.current('docente:update', d));
    socket.on('docente:delete', (d) => onEventRef.current('docente:delete', d));

    socket.on('horario:create', (d) => onEventRef.current('horario:create', d));
    socket.on('horario:update', (d) => onEventRef.current('horario:update', d));
    socket.on('horario:delete', (d) => onEventRef.current('horario:delete', d));

    socket.on('bloque:create', (d) => onEventRef.current('bloque:create', d));
    socket.on('bloque:update', (d) => onEventRef.current('bloque:update', d));
    socket.on('bloque:delete', (d) => onEventRef.current('bloque:delete', d));

    socket.on('dia:create', (d) => onEventRef.current('dia:create', d));
    socket.on('dia:update', (d) => onEventRef.current('dia:update', d));
    socket.on('dia:delete', (d) => onEventRef.current('dia:delete', d));

    socket.on('seccion:create', (d) => onEventRef.current('seccion:create', d));
    socket.on('seccion:update', (d) => onEventRef.current('seccion:update', d));
    socket.on('seccion:delete', (d) => onEventRef.current('seccion:delete', d));

    socket.on('estudiante:create', (d) => onEventRef.current('estudiante:create', d));
    socket.on('estudiante:update', (d) => onEventRef.current('estudiante:update', d));
    socket.on('estudiante:delete', (d) => onEventRef.current('estudiante:delete', d));

    socket.on('representante:create', (d) => onEventRef.current('representante:create', d));
    socket.on('representante:update', (d) => onEventRef.current('representante:update', d));
    socket.on('representante:delete', (d) => onEventRef.current('representante:delete', d));

    socket.on('calificacion:create', (d) => onEventRef.current('calificacion:create', d));
    socket.on('calificacion:update', (d) => onEventRef.current('calificacion:update', d));
    socket.on('calificacion:delete', (d) => onEventRef.current('calificacion:delete', d));
    socket.on('calificacion:bulk', (d) => onEventRef.current('calificacion:bulk', d));
    socket.on('evaluacion:plan-update', (d) => onEventRef.current('evaluacion:plan-update', d));
    socket.on('evaluacion:notas-update', (d) => onEventRef.current('evaluacion:notas-update', d));

    socket.on('materia-pendiente:create', (d) => onEventRef.current('materia-pendiente:create', d));
    socket.on('materia-pendiente:update', (d) => onEventRef.current('materia-pendiente:update', d));
    socket.on('materia-pendiente:delete', (d) => onEventRef.current('materia-pendiente:delete', d));

    return () => { socket.disconnect(); };
  }, [isLoggedIn]);
}
