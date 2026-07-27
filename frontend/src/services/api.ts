const BACKEND_URL = import.meta.env.PROD ? (import.meta.env.VITE_BACKEND_URL || '') : '';

const SESSION_KEY = 'liceo-auth-session';
let csrfTokenValue: string | null = null;

function getSessionToken(): string | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data && data.sessionToken && data.expiresAt && Date.now() < data.expiresAt) {
      return data.sessionToken;
    }
  } catch {
    // ignorar
  }
  return null;
}

function getCsrfToken(): string | null {
  return csrfTokenValue;
}

type RequestOptions = RequestInit & {
  params?: Record<string, string | number | boolean>;
};

async function request<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);

  const token = getSessionToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const csrfToken = getCsrfToken();
  if (csrfToken && !['GET', 'HEAD', 'OPTIONS'].includes((options.method || 'GET').toUpperCase())) {
    headers.set('X-CSRF-Token', csrfToken);
  }

  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  let finalUrl = url;
  if (options.params) {
    const searchParams = new URLSearchParams();
    Object.entries(options.params).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        searchParams.append(key, String(val));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      finalUrl += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  let response = await fetch(BACKEND_URL + finalUrl, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (response.status === 401) {
    const newToken = await refreshSession();
    if (newToken) {
      headers.set('Authorization', `Bearer ${newToken}`);
      response = await fetch(BACKEND_URL + finalUrl, {
        ...options,
        headers,
        credentials: 'include',
      });
    }
  }

    if (!response.ok) {
    let errorMsg = `Error en la petición al servidor (Status: ${response.status} - ${response.statusText} en ${url})`;
    let errDetails: Record<string, string[]> | null = null;
    let errStatusCode: number = response.status;
    try {
      const errJson = await response.json();
      if (errJson.error && errJson.error.message) {
        errorMsg = errJson.error.message;
      }
      if (errJson.error && errJson.error.details) {
        errDetails = errJson.error.details;
      }
      if (errJson.error && errJson.error.statusCode) {
        errStatusCode = errJson.error.statusCode;
      }
    } catch (e) {
      // Ignorar si no es JSON válido
    }
    const err = new Error(errorMsg) as any;
    err.details = errDetails;
    err.statusCode = errStatusCode;
    throw err;
  }

  if (response.status === 204) {
    return {} as T;
  }

  const resJson = await response.json();
  return resJson.data !== undefined ? resJson.data : resJson;
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshSession(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const csrfToken = getCsrfToken();
      const response = await fetch(BACKEND_URL + '/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
        headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : {},
      });
      if (!response.ok) return null;
      const data = await response.json();
      if (data.ok && data.token) {
        const existing = sessionStorage.getItem(SESSION_KEY);
        if (existing) {
          const session = JSON.parse(existing);
          session.sessionToken = data.token;
          session.expiresAt = Date.now() + 8 * 60 * 60 * 1000;
          sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
        }
        return data.token;
      }
      return null;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function initCsrf() {
  try {
    const res = await fetch(BACKEND_URL + '/api/auth/csrf-token', { credentials: 'include' });
    const data = await res.json();
    if (data.csrfToken) {
      csrfTokenValue = data.csrfToken;
    }
  } catch {}
}

initCsrf();

export const api = {
  get: <T>(url: string, params?: Record<string, any>) => request<T>(url, { method: 'GET', params }),
  getRaw: async <T>(url: string, params?: Record<string, any>): Promise<T> => {
    const headers = new Headers();
    const token = getSessionToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null) searchParams.append(key, String(val));
      });
    }
    const qs = searchParams.toString();
    let finalUrl = qs ? `${url}${url.includes('?') ? '&' : '?'}${qs}` : url;

    let res = await fetch(BACKEND_URL + finalUrl, { headers, credentials: 'include' });

    if (res.status === 401) {
      const newToken = await refreshSession();
      if (newToken) {
        headers.set('Authorization', `Bearer ${newToken}`);
        res = await fetch(BACKEND_URL + finalUrl, { headers, credentials: 'include' });
      }
    }

    if (!res.ok) {
      let errorMsg = `Error al descargar (Status: ${res.status})`;
      let errStatusCode: number = res.status;
      try {
        const errJson = await res.json();
        if (errJson.error && errJson.error.message) {
          errorMsg = errJson.error.message;
        }
        if (errJson.error && errJson.error.statusCode) {
          errStatusCode = errJson.error.statusCode;
        }
      } catch {
        // Ignorar si no es JSON válido
      }
      const err = new Error(errorMsg) as any;
      err.statusCode = errStatusCode;
      throw err;
    }
    return res.json();
  },
  post: <T>(url: string, body?: any) =>
    request<T>(url, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(url: string, body?: any) =>
    request<T>(url, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(url: string) => request<T>(url, { method: 'DELETE' }),
  authSession: {
    refresh: refreshSession,
    logout: async () => {
      const csrfToken = getCsrfToken();
      await fetch(BACKEND_URL + '/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : {},
      });
    },
  },
  materiasPendientes: {
    getAll: () => request('/api/materias-pendientes'),
    getByStudent: (id: string) => request(`/api/materias-pendientes/estudiante/${id}`),
    getReprobadas: (id: string) => request(`/api/materias-pendientes/reprobadas/${id}`),
    create: (data: any) => request('/api/materias-pendientes', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`/api/materias-pendientes/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/api/materias-pendientes/${id}`, { method: 'DELETE' }),
    autoCrearMaterias: () => request('/api/materias-pendientes/auto-crear-materias', { method: 'POST' }),
  },
  notificaciones: {
    alertaAcademica: (data: any) => request('/api/notificaciones/alerta-academica', { method: 'POST', body: JSON.stringify(data) })
  },
  historicoNotas: {
    getByStudent: (id: string) => request(`/api/historicos/estudiante/${id}`),
    createBulk: (data: any) => request('/api/historicos/bulk', { method: 'POST', body: JSON.stringify(data) }),
    downloadExcel: async (estudianteId: string, plan: string) => {
      const token = getSessionToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const csrfToken = getCsrfToken();
      if (csrfToken) headers['X-CSRF-Token'] = csrfToken;
      const res = await fetch(BACKEND_URL + `/api/historicos/${estudianteId}/generar-excel?plan=${plan}`, { headers, credentials: 'include' });
      if (!res.ok) {
        let msg = 'Error al generar el Excel';
        try { const err = await res.json(); msg = err.error?.message || msg; } catch {}
        throw new Error(msg);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Notas_Certificadas_${estudianteId}_Plan_${plan}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  },
  especialidades: {
    getAll: () => request('/api/especialidades'),
    create: (data: { nombre: string }) => request('/api/especialidades', { method: 'POST', body: JSON.stringify(data) })
  },
  chatbot: {
    consultar: (mensaje: string, roleId: number, nombre: string) =>
      request<{ respuesta: string }>('/api/chatbot/consultar', {
        method: 'POST',
        body: JSON.stringify({ mensaje, roleId, nombre }),
      }),
  },
  promocion: {
    getPreview: (periodoId: string) => request<any>(`/api/periodos/${periodoId}/promocion-preview`),
    confirmar: (periodoId: string, decisiones: { id_estudiante: number; accion: string; materias_pendientes?: number[] }[]) =>
      request<any>(`/api/periodos/${periodoId}/promocion-confirmar`, {
        method: 'POST',
        body: JSON.stringify({ decisiones }),
      }),
  },
  auth: {
    getProfile: () =>
      request<{ nombre1: string | null; nombre2: string | null; apellido1: string | null; apellido2: string | null; username: string; rol: string | null }>('/api/auth/profile'),
    changePassword: (data: { currentPassword: string; newPassword: string }) =>
      request<{ message: string }>('/api/auth/change-password', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
  },
  formatosSabana: {
    getAll: () => request('/api/formatos'),
    getActive: () => request('/api/formatos/activo'),
    getById: (id: number) => request(`/api/formatos/${id}`),
    create: (data: any) => request('/api/formatos', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => request(`/api/formatos/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    activate: (id: number) => request(`/api/formatos/${id}/activar`, { method: 'PUT' }),
    delete: (id: number) => request(`/api/formatos/${id}`, { method: 'DELETE' }),
  },
};
