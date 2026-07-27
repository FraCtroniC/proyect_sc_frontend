/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSocket } from './hooks/useSocket';
import { motion, AnimatePresence } from 'motion/react';
import toast, { Toaster } from 'react-hot-toast';
import {
  Users,
  GraduationCap,
  Calendar,
  Award,
  Home,
  Shield,
  LayoutDashboard,
  BookOpen,
  ChevronRight,
  LogOut,
  Menu,
  X,
  Lock,
  ClipboardCheck,
  Book,
  CalendarDays,
  Sparkles,
  Clock,
  Database,
  TableProperties,
  FileEdit,
} from 'lucide-react';

import {
  User,
  Student,
  Subject,
  Classroom,
  ScheduleEvent,
  EvaluationPlan,
  Grade,
  Attendance,
  TeacherScheduleLog,
  UserRole,
  StudyPlanItem,
  SchoolPeriod,
  Section,
  Docente,
  SubjectSchedule,
  JustificacionEstudiante,
  AcademicYear,
  DirtyAttendanceRecord
} from './types';

import { api } from './services/api';
import { getErrorMessage } from './utils/errorHandler';
import { mapUsuarioToUser, mapEstudianteToStudent, mapAulaToClassroom, mapAsignaturaToSubject, mapPlanToStudyPlanItem, mapHorarioToScheduleEvent, mapCalificacionToGrade, mapPeriodoToSchoolPeriod, mapEvaluacionesDbToPlans, mapNotaParcialToGrade, mapSeccionToSection, mapRepresentanteToRepresentative, mapDocenteToDocenteType } from './services/mappers';


// Component imports
import Dashboard from './components/Dashboard';
import UserManager from './components/UserManager';
import AcademicManager from './components/AcademicManager';
import StudentManager from './components/StudentManager';
import GradeManager from './components/GradeManager';
import AttendanceTracker from './components/AttendanceTracker';
import ScheduleCoordinator from './components/ScheduleCoordinator';
import FacilitiesManager from './components/FacilitiesManager';
import DocumentationView from './components/DocumentationView';
import LoginScreen from './components/loginScreen';
import SubjectManager from './components/SubjectManager';
import PeriodManager from './components/PeriodManager';
import PendingSubjectsManager from './components/PendingSubjectsManager';
import PromocionManager from './components/PromocionManager';
import ChatbotAsistente from './components/ChatbotAsistente';
import UserProfileModal from './components/UserProfileModal';
import { FormatEditor } from './components/FormatEditor/FormatEditor';

const BACKEND_URL = import.meta.env.PROD ? (import.meta.env.VITE_BACKEND_URL || '') : '';

const VenezuelaClock = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeFormatter = new Intl.DateTimeFormat('es-VE', {
    timeZone: 'America/Caracas',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  const dateFormatter = new Intl.DateTimeFormat('es-VE', {
    timeZone: 'America/Caracas',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  return (
    <div className="flex items-center gap-3 bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-xl px-3 py-2 ml-2 shadow-sm transition-all hover:bg-slate-800/60">
      <div className="hidden sm:flex flex-col items-end leading-none">
        <span className="text-[13px] font-bold text-slate-200 tracking-wide">{timeFormatter.format(time).toUpperCase()}</span>
        <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-widest mt-1">{dateFormatter.format(time).replace('.', '')}</span>
      </div>
      <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
        <Clock className="h-4.5 w-4.5" />
      </div>
    </div>
  );
};

export default function App() {
  // Global States loaded with seed data representing a Venezuelan Liceo
  const [users, setUsers] = useState<User[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [docentes, setDocentes] = useState<Docente[]>([]);

  // Phase 2 Seed arrays from Backend
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [scheduleEvents, setScheduleEvents] = useState<ScheduleEvent[]>([]);
  const [evaluationPlans, setEvaluationPlans] = useState<EvaluationPlan[]>([]);
  const [studyPlans, setStudyPlans] = useState<StudyPlanItem[]>([]);
  const [studyPlanVersions, setStudyPlanVersions] = useState<any[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [periods, setPeriods] = useState<SchoolPeriod[]>([]);

  const [sections, setSections] = useState<Section[]>([]);
  const [representatives, setRepresentatives] = useState<any[]>([]);
  const [referenceData, setReferenceData] = useState<{ dias: any[]; bloques: any[]; grados: any[] }>({ dias: [], bloques: [], grados: [] });

  // Persistence arrays from Backend
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [teacherLogs, setTeacherLogs] = useState<TeacherScheduleLog[]>([]);
  const [matriculasCache, setMatriculasCache] = useState<any[]>([]);

  const [isBackingUp, setIsBackingUp] = useState(false);
  const [materiasPendientes, setMateriasPendientes] = useState<any[]>([]);

  const handleBackup = async () => {
    if (isBackingUp) return;
    setIsBackingUp(true);
    toast.loading("Generando respaldo de la base de datos...", { id: 'backup-toast' });
    try {
      // Usaremos un endpoint directo que devuelve el blob
      const response = await fetch(BACKEND_URL + '/api/system/backup', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Fallo al respaldar');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Respaldo_Liceo_${new Date().toISOString().split('T')[0]}.sql`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      
      toast.success('Respaldo descargado exitosamente', { id: 'backup-toast' });
    } catch (e) {
      toast.error("Error al descargar el respaldo.", { id: 'backup-toast' });
      console.error(e);
    } finally {
      setIsBackingUp(false);
    }
  };

  // Schedule/Horario states for attendance-by-class
  const [horariosDisponibles, setHorariosDisponibles] = useState<SubjectSchedule[]>([]);
  const [miHorario, setMiHorario] = useState<SubjectSchedule[]>([]);

  const checkInitialAuth = () => {
    try {
      const storedUser = sessionStorage.getItem('frontend_new_user');
      const sessionData = sessionStorage.getItem('liceo-auth-session');
      if (storedUser && sessionData) {
        const parsedSession = JSON.parse(sessionData);
        if (parsedSession.expiresAt && parsedSession.expiresAt > Date.now()) {
          return { isLoggedIn: true, user: JSON.parse(storedUser) as User };
        }
      }
    } catch (e) {
      console.error('Error verificando sesión:', e);
    }
    return { isLoggedIn: false, user: null };
  };

  const initialAuth = checkInitialAuth();

  const [isLoggedIn, setIsLoggedIn] = useState(initialAuth.isLoggedIn);
  const [currentUser, setCurrentUser] = useState<User | null>(initialAuth.user);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>(initialAuth.user?.role || 'super_admin');
  const [activeTab, setActiveTab] = useState<string>(() => {
    return localStorage.getItem('mppe_active_tab') || 'dashboard';
  });
  const [viewPendingStudentId, setViewPendingStudentId] = useState<string>('');
  const [pendingRefreshKey, setPendingRefreshKey] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [promocionModal, setPromocionModal] = useState<{ isOpen: boolean; periodoId: string; periodoNombre: string }>({ isOpen: false, periodoId: '', periodoNombre: '' });

  useEffect(() => {
    if (!initialAuth.isLoggedIn) {
      sessionStorage.removeItem('liceo-auth-session');
      sessionStorage.removeItem('frontend_new_user');
    }
  }, []);

  // Persistir pestaña activa en localStorage al recargar la página
  useEffect(() => {
    localStorage.setItem('mppe_active_tab', activeTab);
  }, [activeTab]);

  // WebSocket: escuchar cambios en periodos escolares y usuarios
  useSocket(isLoggedIn, (event, payload) => {
    if (event === 'periodo:create') {
      setPeriods(prev => [...prev, mapPeriodoToSchoolPeriod(payload.data)]);
    } else if (event === 'periodo:update') {
      setPeriods(prev => prev.map(p =>
        p.id === String(payload.data.id_periodo)
          ? mapPeriodoToSchoolPeriod(payload.data) : p
      ));
    } else if (event === 'periodo:delete') {
      setPeriods(prev => prev.filter(p =>
        p.id !== String(payload.data.id_periodo)
      ));
    } else if (event === 'usuario:create') {
      setUsers(prev => [mapUsuarioToUser(payload.data), ...prev]);
    } else if (event === 'usuario:update') {
      setUsers(prev => prev.map(u =>
        u.id === String(payload.data.id || payload.data.id_usuario)
          ? mapUsuarioToUser(payload.data) : u
      ));
    } else if (event === 'usuario:delete') {
      setUsers(prev => prev.filter(u =>
        u.id !== String(payload.data.id_usuario)
      ));
    } else if (event === 'aula:create') {
      setClassrooms(prev => [mapAulaToClassroom(payload.data), ...prev]);
    } else if (event === 'aula:update') {
      setClassrooms(prev => prev.map(c =>
        c.id === String(payload.data.id_aula)
          ? mapAulaToClassroom(payload.data) : c
      ));
    } else if (event === 'aula:delete') {
      setClassrooms(prev => prev.filter(c =>
        c.id !== String(payload.data.id_aula)
      ));
    } else if (event === 'plan-estudio:create') {
      setStudyPlans(prev => [...prev, mapPlanToStudyPlanItem(payload.data)]);
    } else if (event === 'plan-estudio:update') {
      setStudyPlans(prev => prev.map(p =>
        p.id === String(payload.data.id_plan)
          ? mapPlanToStudyPlanItem(payload.data) : p
      ));
    } else if (event === 'plan-estudio:delete') {
      setStudyPlans(prev => prev.filter(p =>
        p.id !== String(payload.data.id_plan)
      ));
    } else if (event === 'docente:create') {
      setDocentes(prev => [mapDocenteToDocenteType(payload.data), ...prev]);
    } else if (event === 'docente:update') {
      setDocentes(prev => prev.map(d =>
        d.id === String(payload.data.id_docente || payload.data.id)
          ? mapDocenteToDocenteType(payload.data) : d
      ));
    } else if (event === 'docente:delete') {
      setDocentes(prev => prev.filter(d =>
        d.id !== String(payload.data.id_docente)
      ));
    } else if (event === 'horario:create') {
      setScheduleEvents(prev => [...prev, mapHorarioToScheduleEvent(payload.data)]);
    } else if (event === 'horario:update') {
      setScheduleEvents(prev => prev.map(e =>
        e.id === String(payload.data.id_horario)
          ? mapHorarioToScheduleEvent(payload.data) : e
      ));
    } else if (event === 'horario:delete') {
      setScheduleEvents(prev => prev.filter(e =>
        e.id !== String(payload.data.id_horario)
      ));
    } else if (event === 'bloque:create') {
      setReferenceData(prev => ({ ...prev, bloques: [...prev.bloques, payload.data] }));
    } else if (event === 'bloque:update') {
      setReferenceData(prev => ({
        ...prev,
        bloques: prev.bloques.map(b =>
          b.id_bloque === payload.data.id_bloque ? payload.data : b
        )
      }));
    } else if (event === 'bloque:delete') {
      setReferenceData(prev => ({
        ...prev,
        bloques: prev.bloques.filter(b => b.id_bloque !== payload.data.id_bloque)
      }));
    } else if (event === 'dia:create') {
      setReferenceData(prev => ({ ...prev, dias: [...prev.dias, payload.data] }));
    } else if (event === 'dia:update') {
      setReferenceData(prev => ({
        ...prev,
        dias: prev.dias.map(d =>
          d.id_dia === payload.data.id_dia ? payload.data : d
        )
      }));
    } else if (event === 'dia:delete') {
      setReferenceData(prev => ({
        ...prev,
        dias: prev.dias.filter(d => d.id_dia !== payload.data.id_dia)
      }));
    } else if (event === 'seccion:create') {
      setSections(prev => [...prev, mapSeccionToSection(payload.data)]);
    } else if (event === 'seccion:update') {
      setSections(prev => prev.map(s =>
        s.id === String(payload.data.id_seccion)
          ? mapSeccionToSection(payload.data) : s
      ));
    } else if (event === 'seccion:delete') {
      setSections(prev => prev.filter(s =>
        s.id !== String(payload.data.id_seccion)
      ));
    } else if (event === 'estudiante:create') {
      refreshStudents();
    } else if (event === 'estudiante:update') {
      const activePeriodId = periods.find(p => p.status === 'Activo')?.id ? Number(periods.find(p => p.status === 'Activo')?.id) : undefined;
      setStudents(prev => prev.map(s =>
        s.id === String(payload.data.id_estudiante)
          ? mapEstudianteToStudent(payload.data, matriculasCache, sections, activePeriodId) : s
      ));
    } else if (event === 'estudiante:delete') {
      setStudents(prev => prev.filter(s =>
        s.id !== String(payload.data.id_estudiante)
      ));
    } else if (event === 'representante:create') {
      setRepresentatives(prev => [...prev, payload.data]);
    } else if (event === 'representante:update') {
      setRepresentatives(prev => prev.map(r =>
        r.id_representante === payload.data.id_representante ? payload.data : r
      ));
    } else if (event === 'representante:delete') {
      setRepresentatives(prev => prev.filter(r =>
        r.id_representante !== payload.data.id_representante
      ));
    } else if (event === 'calificacion:create') {
      refreshGrades();
    } else if (event === 'calificacion:update') {
      refreshGrades();
    } else if (event === 'calificacion:delete') {
      refreshGrades();
    } else if (event === 'calificacion:bulk') {
      refreshGrades();
    } else if (event === 'evaluacion:plan-update') {
      // No refresh - handleUpdateEvaluationPlan already does optimistic update
    } else if (event === 'evaluacion:notas-update') {
      refreshGrades();
    } else if (event === 'materia-pendiente:create' || event === 'materia-pendiente:update' || event === 'materia-pendiente:delete') {
      setPendingRefreshKey(k => k + 1);
    }
  });

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setCurrentUserRole(user.role);
    
    // Al iniciar sesión, forzar la vista inicial correspondiente a su rol
    const roleTabs = tabGroups.flatMap(g => g.items).filter(t => t.allowedRoles.includes(user.role));
    if (roleTabs.length > 0) {
      setActiveTab(roleTabs[0].id);
    }
    
    setIsLoggedIn(true);
    sessionStorage.setItem('frontend_new_user', JSON.stringify(user));
  };

  const handleLogout = async () => {
    try {
      await fetch(BACKEND_URL + '/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch { }
    setIsLoggedIn(false);
    setCurrentUser(null);
    setCurrentUserRole('super_admin');
    setActiveTab('dashboard');
    sessionStorage.removeItem('liceo-auth-session');
    sessionStorage.removeItem('frontend_new_user');
  };

  const daysAgo = (days: number): string => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
  };

  useEffect(() => {
    if (isLoggedIn) {
      const loadInitialData = async () => {
        try {
          const periodosData = await api.get<any[]>('/api/periodos').catch(() => ({ data: [] }));
          const parsedPeriodos = Array.isArray(periodosData) ? periodosData : (periodosData as any)?.data || [];
          const activeDbPeriod = parsedPeriodos.find((p: any) => p.estatus === 'Activo');
          const activePeriodId = activeDbPeriod ? activeDbPeriod.id_periodo : undefined;
          const periodoParam = activePeriodId ? `?id_periodo=${activePeriodId}` : '';

          const [
            usuariosData,
            estudiantesData,
            aulasData,
            asignaturasData,
            planesData,
            horariosData,
            calificacionesData,
            auditoriaData,
            evaluacionesPlanesResp,
            evaluacionesNotasResp,
            seccionesData,
            representantesData,
            diasData,
            bloquesData,
            asistenciasData,
            asistenciasEstudiantesData,
            matriculasData,
            docentesData,
            gradosData,
            tipoPlanesData
          ] = await Promise.all([
            api.get<any[]>('/api/usuarios'),
            api.get<any[]>('/api/estudiantes'),
            api.get<any[]>('/api/aulas'),
            api.get<any[]>('/api/asignaturas'),
            api.get<any[]>('/api/plan-estudio'),
            api.get<any[]>('/api/horarios'),
            api.get<any[]>(`/api/calificaciones${periodoParam}`),
            api.get<any[]>('/api/auditorias').catch(() => []),
            api.get<any[]>(`/api/evaluaciones/planes${periodoParam}`).catch(() => ({ data: [] })),
            api.get<any[]>(`/api/evaluaciones/notas${periodoParam}`).catch(() => ({ data: [] })),
            api.get<any[]>('/api/secciones').catch(() => []),
            api.get<any[]>('/api/representantes').catch(() => []),
            api.get<any[]>('/api/dias').catch(() => []),
            api.get<any[]>('/api/bloques').catch(() => []),
            api.get<any[]>('/api/asistencias?limit=200&fecha_desde=' + daysAgo(60)).catch(() => []),
            api.get<any[]>('/api/asistencias-estudiantes?limit=500&fecha_desde=' + daysAgo(60)).catch(() => []),
            api.get<any[]>('/api/matriculas').catch(() => ({ data: [] })),
            Promise.resolve([]),
            api.get<any[]>('/api/grados').catch(() => ({ data: [] })),
            api.get<any[]>('/api/tipo-plan-estudio').catch(() => ({ data: [] }))
          ]);

          const seccionesArr = Array.isArray(seccionesData) ? seccionesData : [];
          const seccionesMap: Record<number, any> = {};
          for (const s of seccionesArr) {
            seccionesMap[s.id_seccion] = s;
          }

          const mappedUsers = usuariosData.map(mapUsuarioToUser);
          setUsers(mappedUsers);

          // Enrich currentUser with correct numeric ID and teacherId from DB
          if (currentUser) {
            const match = mappedUsers.find(u =>
              u.username === currentUser.username || u.username === currentUser.id || u.name === currentUser.name
            );
            if (match) {
              setCurrentUser(prev => prev ? { ...prev, id: match.id, teacherId: match.teacherId, cedula: match.cedula || prev.cedula } : prev);
            }
          }

          const usuariosArray = Array.isArray(usuariosData) ? usuariosData : (usuariosData as any)?.data || [];
          const docentesApiData = usuariosArray.filter((u: any) => (u.idRol || u.id_rol) === 5);
          const parsedDocentes = docentesApiData.map(mapDocenteToDocenteType);
          setDocentes(parsedDocentes);
          setStudents(estudiantesData.map((s: any) => mapEstudianteToStudent(s, Array.isArray(matriculasData) ? matriculasData : (matriculasData as any)?.data || [], Array.isArray(seccionesData) ? seccionesData : [], activePeriodId)));
          setClassrooms(aulasData.map(mapAulaToClassroom));
          
          // The user requested to filter the subjects in schedule module to only show Plan 31059.
          // We will map all subjects and study plans, but Schedule module should filter them.
          const parsedTipoPlanes = Array.isArray(tipoPlanesData) ? tipoPlanesData : ((tipoPlanesData as any)?.data || []);
          
          setSubjects(asignaturasData.map((a: any) => mapAsignaturaToSubject(a, planesData)));

          const studyPlansList = planesData.map(mapPlanToStudyPlanItem);
          setStudyPlans(studyPlansList);
          setStudyPlanVersions(parsedTipoPlanes);

          const dbEvaluationsList = (Array.isArray((evaluacionesPlanesResp as any)?.data) ? (evaluacionesPlanesResp as any).data : (Array.isArray(evaluacionesPlanesResp) ? evaluacionesPlanesResp : [])) || [];
          const dbPlans = mapEvaluacionesDbToPlans(dbEvaluationsList, planesData, seccionesMap);

          setEvaluationPlans(dbPlans);

          setScheduleEvents(horariosData.map(mapHorarioToScheduleEvent));

          // Use Partial Grades if they exist, fallback to Calificaciones
          const dbNotasParciales = (Array.isArray((evaluacionesNotasResp as any)?.data) ? (evaluacionesNotasResp as any).data : (Array.isArray(evaluacionesNotasResp) ? evaluacionesNotasResp : [])) || [];
          if (dbNotasParciales.length > 0) {
            setGrades(dbNotasParciales.map((n: any) => mapNotaParcialToGrade(n, String(n.matricula?.id_estudiante || n.id_matricula))));
          } else {
            setGrades(calificacionesData.map((c: any) => mapCalificacionToGrade(c, String(c.matricula?.id_estudiante || c.id_matricula))));
          }

          setAuditLogs(auditoriaData.sort((a, b) => new Date(b.fecha_hora).getTime() - new Date(a.fecha_hora).getTime()));
          const periodosList = Array.isArray(periodosData) ? periodosData : (periodosData as any)?.data || [];
          setPeriods(periodosList.map(mapPeriodoToSchoolPeriod));
          setSections((Array.isArray(seccionesData) ? seccionesData : []).map(mapSeccionToSection));
          setRepresentatives(Array.isArray(representantesData) ? representantesData : []);
          setReferenceData({
            dias: Array.isArray(diasData) ? diasData : ((diasData as any)?.data || []),
            bloques: Array.isArray(bloquesData) ? bloquesData : ((bloquesData as any)?.data || []),
            grados: Array.isArray(gradosData) ? gradosData : ((gradosData as any)?.data || [])
          });

          // Cache matrículas
          const matriculasList = Array.isArray(matriculasData) ? matriculasData : (matriculasData as any)?.data || [];
          setMatriculasCache(matriculasList);

          // Set Asistencias
          if (Array.isArray(asistenciasData)) {
            setTeacherLogs(asistenciasData.map((a: any) => ({
              id: String(a.id_asistencia),
              teacherId: String(a.id_docente),
              date: a.fecha,
              clockInTime: a.hora_entrada,
              clockOutTime: a.hora_salida,
              status: a.estatus === 'Puntual' ? 'OnTime' : a.estatus === 'Retardo' ? 'Late' : a.estatus === 'Justificado' ? 'Justified' : 'Absent',
              justificaciones: a.justificaciones || []
            })));
          }

          if (Array.isArray(asistenciasEstudiantesData)) {
            const justificacionesData = await api.get<any[]>('/api/justificaciones-estudiantes').catch(() => []);
            const justMap = new Map<number, JustificacionEstudiante[]>();
            if (Array.isArray(justificacionesData)) {
              justificacionesData.forEach((j: any) => {
                const key = j.id_asistencia_est;
                if (!justMap.has(key)) justMap.set(key, []);
                justMap.get(key)!.push({
                  id: j.id_justificacion_est,
                  id_asistencia_est: j.id_asistencia_est,
                  motivo: j.motivo || '',
                  soporte_digital: j.soporte_digital || null,
                  created_at: j.created_at,
                });
              });
            }
            setAttendance(asistenciasEstudiantesData.map((a: any) => ({
              id: String(a.id_asistencia_est),
              studentId: String(a.matricula?.id_estudiante || ''),
              matriculaId: String(a.id_matricula),
              date: a.fecha,
              academicYear: a.matricula?.seccion?.id_grado || 1,
              section: a.matricula?.seccion?.letra || 'A',
              status: a.estatus === 'Ausente' ? 'A' : (a.estatus === 'Justificado' ? 'J' : 'P'),
              observacion: a.observacion ? {
                id_observacion: a.observacion.id_observacion,
                texto: a.observacion.texto,
                gravedad: a.observacion.gravedad,
                id_usuario_crea: a.observacion.id_usuario_crea,
                created_at: a.observacion.created_at,
              } : undefined,
              justificaciones: justMap.get(a.id_asistencia_est) || [],
              horarioId: a.id_horario != null ? String(a.id_horario) : undefined,
            })));
          }
        } catch (error: any) {
          console.error("Error al cargar datos desde el backend:", error);
          toast.error("Error al cargar datos desde el backend: " + getErrorMessage(error));
        }
      };
      loadInitialData();
    }
  }, [isLoggedIn]);

  // Refrescar usuarios cuando se abre el módulo Roles de Acceso
  useEffect(() => {
    if (activeTab === 'users' && isLoggedIn) {
      api.get<any[]>('/api/usuarios').then(data => {
        const parsed = Array.isArray(data) ? data : (data as any)?.data || [];
        setUsers(parsed.map(mapUsuarioToUser));
      }).catch(() => { });
    }
  }, [activeTab, isLoggedIn]);

  // --- PERSISTENCE ACTIONS PASSED DOWN ---
  const handleAddUser = async (newUser: Partial<User> & { password?: string; lastName?: string; username?: string; secondName?: string; secondLastName?: string; dateOfBirth?: string; id_especialidad?: number }) => {
    try {
      const cleanCedula = (newUser.cedula || '').replace(/^[VE]-/, '');

      const dto: any = {
        username: newUser.username || cleanCedula || newUser.email?.split('@')[0] || 'User',
        password: newUser.password || 'TempPass1!',
        idRol: newUser.role === 'super_admin' ? 4 : newUser.role === 'control_estudios' ? 8 : newUser.role === 'coordinador' ? 7 : 5,
        cedula: newUser.cedula || undefined,
        nombre1: newUser.name || undefined,
        nombre2: newUser.secondName || undefined,
        apellido1: newUser.lastName || undefined,
        apellido2: newUser.secondLastName || undefined,
        correo: newUser.email || undefined,
        telefono: newUser.phone || undefined,
        fecha_nac: newUser.dateOfBirth || undefined,
        id_especialidad: newUser.id_especialidad || undefined,
      };
      const created = await api.post<any>('/api/usuarios', dto);
      setUsers(prev => [mapUsuarioToUser(created), ...prev]);
    } catch (e: any) {
      console.error('Error al crear usuario:', e);
      const err = new Error('Error al crear usuario') as any;
      if (e.details) err.fieldErrors = e.details;
      throw err;
    }
  };

  const handleEditUser = async (userId: string, data: Partial<User> & { password?: string; lastName?: string; username?: string; secondName?: string; secondLastName?: string; dateOfBirth?: string; id_especialidad?: number }) => {
    try {
      const dto: any = {};
      if (data.username) dto.username = data.username;
      if (data.password) dto.password = data.password;
      if (data.email) dto.correo = data.email;
      if (data.phone) dto.telefono = data.phone;
      if (data.cedula) dto.cedula = data.cedula;
      if (data.name) dto.nombre1 = data.name;
      if (data.secondName) dto.nombre2 = data.secondName;
      if (data.lastName) dto.apellido1 = data.lastName;
      if (data.secondLastName) dto.apellido2 = data.secondLastName;
      if (data.role) dto.idRol = data.role === 'super_admin' ? 4 : data.role === 'control_estudios' ? 8 : data.role === 'coordinador' ? 7 : 5;
      if (data.dateOfBirth) dto.fecha_nac = data.dateOfBirth;
      if (data.id_especialidad !== undefined) dto.id_especialidad = data.id_especialidad;

      const updated = await api.patch<any>(`/api/usuarios/${stripId(userId)}`, dto);
      setUsers(prev => prev.map(u => u.id === userId ? mapUsuarioToUser(updated) : u));
    } catch (e: any) {
      console.error(e);
      const details = e.details;
      if (details && typeof details === 'object') {
        const err = new Error('Error de validación') as any;
        err.fieldErrors = details;
        throw err;
      }
      throw new Error(getErrorMessage(e, 'Error al actualizar usuario'));
    }
  };

  const stripId = (id: string) => id.replace(/^[a-zA-Z]+-/, '');

  const handleToggleUserActive = async (userId: string) => {
    try {
      const user = users.find(u => u.id === userId);
      if (user) {
        const updated = await api.patch<any>(`/api/usuarios/${stripId(userId)}`, { estatus: user.active ? 'Inactivo' : 'Activo' });
        setUsers(prev => prev.map(u => u.id === userId ? mapUsuarioToUser(updated) : u));
      }
    } catch (e: any) {
      console.error(e);
      throw new Error(getErrorMessage(e, 'Error al cambiar estatus del usuario'));
    }
  };

  const handleAddStudent = async (newStudent: Student) => {
    try {
      const repPayload: any = {
        cedula_rep: newStudent.representativeCedula,
        nombre1: newStudent.repFirstName || newStudent.representativeName.split(' ')[0] || '',
        apellido1: newStudent.repLastName || newStudent.representativeName.split(' ').slice(1).join(' ') || '',
        telefono: newStudent.representativePhone
      };
      if (newStudent.repSecondName) repPayload.nombre2 = newStudent.repSecondName;
      if (newStudent.repSecondLastName) repPayload.apellido2 = newStudent.repSecondLastName;
      if (newStudent.representativeEmail) repPayload.correo = newStudent.representativeEmail;
      if (newStudent.representativeAddress) repPayload.direccion = newStudent.representativeAddress;

      const createdRep = await api.post<any>('/api/representantes', repPayload);
      const repId = createdRep.id_representante || createdRep.id;

      const stuNameParts = newStudent.firstName.trim().split(' ');
      const stuLastParts = newStudent.lastName.trim().split(' ');
      const estPayload: any = {
        cedula_escolar: newStudent.cedula,
        nombre1: stuNameParts[0] || '',
        apellido1: stuLastParts[0] || '',
        fecha_nac: newStudent.dateOfBirth,
        id_representante: Number(repId),
        id_grado: newStudent.academicYear,
        estatus_estudiante: 'Activo'
      };
      if (stuNameParts.length > 1) estPayload.nombre2 = stuNameParts.slice(1).join(' ');
      if (stuLastParts.length > 1) estPayload.apellido2 = stuLastParts.slice(1).join(' ');
      if (newStudent.gender) estPayload.genero = newStudent.gender;
      if (newStudent.birthPlace) estPayload.lugar_nac = newStudent.birthPlace;
      if (newStudent.municipality) estPayload.municipio = newStudent.municipality;
      if (newStudent.state) estPayload.estado = newStudent.state;

      const created = await api.post<any>('/api/estudiantes', estPayload);
      const studentId = created.id_estudiante || created.id;

      const activePeriod = periods.find(p => p.status === 'Activo');
      const matchingSection = sections.find(s => s.grade === newStudent.academicYear && s.letter === newStudent.section);
      if (activePeriod && matchingSection) {
        await api.post('/api/matriculas', {
          id_estudiante: Number(studentId),
          id_seccion: Number(matchingSection.id),
          id_periodo: Number(activePeriod.id),
          estatus_matricula: 'Activo'
        }).catch((e: any) => console.warn('Matrícula no creada:', e.message));
      }

      refreshStudents();
    } catch (e) {
      console.error(e);
      toast.error('Error al crear estudiante en BD');
    }
  };

  const handleUpdateStudentStatus = async (studentId: string, status: 'Activo' | 'Inactivo' | 'Retirado') => {
    try {
      await api.patch(`/api/estudiantes/${stripId(studentId)}`, { estatus_estudiante: status });
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateStudentProfile = async (studentId: string, updatedData: Student) => {
    try {
      const realId = stripId(studentId);

      const stuResp = await api.get<any>(`/api/estudiantes/${realId}`);
      const repId = stuResp.id_representante;

      if (repId) {
        const repPayload: any = {
          cedula_rep: updatedData.representativeCedula,
          nombre1: updatedData.repFirstName || updatedData.representativeName.split(' ')[0],
          nombre2: updatedData.repSecondName || undefined,
          apellido1: updatedData.repLastName || updatedData.representativeName.split(' ').slice(1).join(' ') || 'N/A',
          apellido2: updatedData.repSecondLastName || undefined,
          telefono: updatedData.representativePhone,
          correo: updatedData.representativeEmail,
          direccion: updatedData.representativeAddress
        };
        await api.patch(`/api/representantes/${repId}`, repPayload);
      }

      const stuNameParts = updatedData.firstName.trim().split(' ');
      const stuLastParts = updatedData.lastName.trim().split(' ');
      const estPayload: any = {
        cedula_escolar: updatedData.cedula,
        nombre1: stuNameParts[0] || '',
        nombre2: stuNameParts.slice(1).join(' ') || undefined,
        apellido1: stuLastParts[0] || '',
        apellido2: stuLastParts.slice(1).join(' ') || undefined,
        fecha_nac: updatedData.dateOfBirth,
        genero: updatedData.gender,
        lugar_nac: updatedData.birthPlace,
        municipio: updatedData.municipality,
        estado: updatedData.state,
        estatus_estudiante: updatedData.status
      };

      await api.patch(`/api/estudiantes/${realId}`, estPayload);
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const handleAddStudyPlanItem = async (name: string, year: number, codigo: string, posicion: number, tipoCalificacion: string, id_tipo_plan: number) => {
    // 1. Check if subject exists or create it
    let subjectId = subjects.find(s => s.name.toLowerCase() === name.toLowerCase())?.id;

    if (!subjectId) {
      const subResp = await api.post<any>('/api/asignaturas', {
        nombre: name,
        tipo_calificacion: tipoCalificacion
      });
      const newSub = mapAsignaturaToSubject(subResp);
      setSubjects(p => [...p, newSub]);
      subjectId = newSub.id;
    }

    // 2. Create the plan_estudio record
    const planResp = await api.post<any>('/api/plan-estudio', {
      id_asignatura: Number(subjectId),
      id_grado: year,
      codigo_asignatura: codigo,
      posicion: posicion,
      id_tipo_plan: id_tipo_plan
    });
    setStudyPlans(prev => [...prev, mapPlanToStudyPlanItem(planResp)]);
  };
  const handleUpdateStudyPlanItem = async (id: string, name: string, year: number, codigo: string, posicion: number, tipoCalificacion: string, id_tipo_plan: number) => {
    // 1. Ensure subject exists or create it
    let subjectId = subjects.find(s => s.name.toLowerCase() === name.toLowerCase())?.id;
    if (!subjectId) {
      const subResp = await api.post<any>('/api/asignaturas', {
        nombre: name,
        tipo_calificacion: tipoCalificacion
      });
      const newSub = mapAsignaturaToSubject(subResp);
      setSubjects(p => [...p, newSub]);
      subjectId = newSub.id;
    }

    // 2. Update the plan_estudio record
    const planResp = await api.patch<any>(`/api/plan-estudio/${stripId(id)}`, {
      id_asignatura: Number(subjectId),
      id_grado: year,
      codigo_asignatura: codigo,
      posicion: posicion,
      id_tipo_plan: id_tipo_plan
    });
    setStudyPlans(prev => prev.map(sp => sp.id === stripId(id) ? mapPlanToStudyPlanItem(planResp) : sp));
  };

  const handleDeleteStudyPlanItem = async (id: string) => {
    try {
      await api.delete(`/api/plan-estudio/${stripId(id)}`);
      setStudyPlans(prev => prev.filter(sp => sp.id !== stripId(id)));
    } catch (e) {
      console.error(e);
      toast.error(getErrorMessage(e, 'Error al eliminar la materia del plan de estudio'));
    }
  };

  const handleAddStudyPlanVersion = async (name: string) => {
    try {
      const resp = await api.post<any>('/api/tipo-plan-estudio', { nombre: name });
      setStudyPlanVersions(p => [...p, resp]);
      return resp;
    } catch (e: any) {
      console.error(e);
      toast.error(getErrorMessage(e, 'Error al crear una nueva versión de plan de estudio'));
      throw e;
    }
  };

  const handleDeleteStudyPlanVersion = async (id: number) => {
    try {
      await api.delete(`/api/tipo-plan-estudio/${id}`);
      setStudyPlanVersions(p => p.filter(v => v.id_tipo_plan !== id));
      toast.success('Versión eliminada exitosamente');
    } catch (e: any) {
      console.error(e);
      toast.error(getErrorMessage(e, 'Error al eliminar la versión del plan de estudio'));
      throw e;
    }
  };

  const handleUpdateSubject = async (id: string, name: string) => {
    try {
      await api.patch(`/api/asignaturas/${stripId(id)}`, { nombre: name });
      setSubjects(p => p.map(s => s.id === id ? { ...s, name, shortName: name.substring(0, 3).toUpperCase() } : s));
    } catch (e) {
      console.error(e);
      toast.error(getErrorMessage(e, 'Error al actualizar la asignatura en la base de datos'));
    }
  };

  const handleAddPeriod = async (name: string, status: 'Activo' | 'Planificación', fecha_inicio?: string | null, fecha_fin?: string | null) => {
    try {
      const resp = await api.post<any>('/api/periodos', {
        nombre: name,
        estatus: status,
        fecha_inicio: fecha_inicio || null,
        fecha_fin: fecha_fin || null,
      });
      setPeriods(prev => [...prev, mapPeriodoToSchoolPeriod(resp)]);
    } catch (e: any) {
      console.error(e);
      toast.error(getErrorMessage(e, 'Error al crear periodo escolar'));
      throw e;
    }
  };

  const handleUpdatePeriodStatus = async (id: string, newStatus: 'Activo' | 'Cerrado' | 'Planificación') => {
    try {
      const updated = await api.patch<any>(`/api/periodos/${stripId(id)}`, { estatus: newStatus });
      setPeriods(prev => prev.map(p => p.id === String(updated.id_periodo) ? mapPeriodoToSchoolPeriod(updated) : p));
    } catch (e) {
      console.error(e);
      toast.error(getErrorMessage(e, 'Error al actualizar periodo escolar'));
      throw e;
    }
  };

  const handleUpdateMomentoStatus = async (id_momento: number, newStatus: 'Abierto' | 'Cerrado') => {
    try {
      await api.patch<any>(`/api/momentos/${id_momento}`, { estatus: newStatus });
      // La actualización se reflejará vía websocket `periodo:update` emitido por momento.controller.ts
      toast.success(`Lapso ${newStatus === 'Abierto' ? 'Abierto' : 'Cerrado'} exitosamente`);
    } catch (e) {
      console.error(e);
      toast.error(getErrorMessage(e, 'Error al actualizar estatus del lapso'));
      throw e;
    }
  };

  const handleEditPeriod = async (id: string, data: { nombre?: string; estatus?: string; fecha_inicio?: string | null; fecha_fin?: string | null }) => {
    try {
      const updated = await api.patch<any>(`/api/periodos/${stripId(id)}`, data);
      setPeriods(prev => prev.map(p => p.id === String(updated.id_periodo) ? mapPeriodoToSchoolPeriod(updated) : p));
    } catch (e) {
      console.error(e);
      toast.error(getErrorMessage(e, 'Error al editar periodo escolar'));
      throw e;
    }
  };

  const handleCierreAnual = async (id: string) => {
    try {
      const response = await api.post<any>(`/api/periodos/${stripId(id)}/cierre-anual`);
      toast.success(response.message || 'Cierre de año escolar completado');
      if (response.data) {
        setPeriods(prev => prev.map(p => p.id === String(response.data.id_periodo) ? mapPeriodoToSchoolPeriod(response.data) : p));
      }
    } catch (e: any) {
      console.error(e);
      toast.error('Error al cerrar el año escolar: ' + getErrorMessage(e));
      throw e;
    }
  };

  const handleOpenPromocion = (periodoId: string, periodoNombre: string) => {
    setPromocionModal({ isOpen: true, periodoId, periodoNombre });
  };

  const handleClosePromocion = () => {
    setPromocionModal({ isOpen: false, periodoId: '', periodoNombre: '' });
  };

  const fetchPeriods = async () => {
    try {
      const periodosData = await api.get<any[]>('/api/periodos');
      const periodosList = Array.isArray(periodosData) ? periodosData : (periodosData as any)?.data || [];
      setPeriods(periodosList.map(mapPeriodoToSchoolPeriod));
    } catch (e) {
      console.error('Error fetching periods', e);
    }
  };

  const handleCreateSection = async (periodId: string, grade: number, letter: string, teacherGuideId: string, homeClassroomId: string) => {
    try {
      const payload = {
        id_periodo: Number(periodId),
        id_grado: grade,
        letra: letter,
        id_docente_guia: Number(teacherGuideId.replace(/\D/g, '')) || 1,
        id_aula: Number(homeClassroomId.replace(/\D/g, '')) || undefined
      };
      const created = await api.post<any>('/api/secciones', payload);
      const newSection = mapSeccionToSection(created);
      if (homeClassroomId && !newSection.homeClassroomId) {
        newSection.homeClassroomId = homeClassroomId;
      }
      setSections(prev => [...prev, newSection]);
      toast.success(`Sección "${newSection.grade}° ${newSection.letter}" creada exitosamente.`);
      return newSection;
    } catch (e: any) {
      console.error('Error al crear sección:', e);
      throw new Error(getErrorMessage(e, 'Error desconocido'));
    }
  };

  const handleUpdateSection = async (sectionId: string, data: { periodId?: string; grade?: number; letter?: string; teacherGuideId?: string; homeClassroomId?: string; capacityMax?: number }) => {
    try {
      const payload: any = {};
      if (data.periodId) payload.id_periodo = Number(data.periodId);
      if (data.grade !== undefined) payload.id_grado = data.grade;
      if (data.letter) payload.letra = data.letter;
      if (data.teacherGuideId) payload.id_docente_guia = Number(data.teacherGuideId.replace(/\D/g, '')) || 1;
      if (data.homeClassroomId !== undefined) payload.id_aula = Number(data.homeClassroomId.replace(/\D/g, '')) || null;
      if (data.capacityMax !== undefined) payload.capacidad_maxima = data.capacityMax || null;

      const updated = await api.patch<any>(`/api/secciones/${sectionId}`, payload);
      setSections(prev => prev.map(s => s.id === sectionId ? mapSeccionToSection(updated) : s));
    } catch (e: any) {
      console.error('Error al actualizar sección:', e);
      throw new Error(getErrorMessage(e, 'Error desconocido'));
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    try {
      await api.delete(`/api/secciones/${sectionId}`);
      setSections(prev => prev.filter(s => s.id !== sectionId));
    } catch (e: any) {
      console.error('Error al eliminar sección:', e);
      throw new Error(getErrorMessage(e, 'Error desconocido'));
    }
  };

  const handleUpdateGrade = (stdId: string, subId: string, lap: 1 | 2 | 3, evId: string, score: number) => {
    setGrades(p => {
      // Check if record exists
      const existsIdx = p.findIndex(g => g.studentId === stdId && g.subjectId === subId && g.lapso === lap && g.evaluationId === evId);
      if (existsIdx >= 0) {
        const copy = [...p];
        copy[existsIdx] = { ...copy[existsIdx], score };
        return copy;
      } else {
        return [...p, { studentId: stdId, subjectId: subId, lapso: lap, evaluationId: evId, score }];
      }
    });
  };

  const handleSaveGrades = async (gradesToSave: Grade[], subjectName: string, year: number, section: string, lapso: number, detalles?: any[], planEvaluaciones?: any[]) => {
    try {
      const payload = gradesToSave.map(g => {
        const evId = Number(g.evaluationId);
        if (isNaN(evId)) {
          throw new Error("MOCK_PLAN");
        }
        return {
          id_estudiante: Number(g.studentId.replace('std-', '')),
          id_evaluacion: evId,
          id_escala: g.score,
        };
      });

      await api.post('/api/evaluaciones/notas/bulk', { notas_parciales: payload });

      const userIdStr = currentUser ? currentUser.id.replace(/\D/g, '') : '';
      const auditPayload = {
        id_usuario: userIdStr.length > 0 ? Number(userIdStr) : null,
        accion: 'GUARDAR_NOTAS',
        tabla_afectada: 'notas_parciales',
        valores_nuevos: { asignatura: subjectName, year: year, section: section, lapso, detalles, planEvaluaciones }
      };
      try {
        const createdAudit = await api.post<any>('/api/auditorias', auditPayload);
        setAuditLogs(p => [createdAudit, ...p]);
      } catch {
        // Auditoría es secundaria — si falla por permisos, no bloquea el guardado
      }

    } catch (e: any) {
      console.error("Error al guardar calificaciones:", e);
      if (e.message === "MOCK_PLAN") {
        toast.error("⚠️ ATENCIÓN: Debes 'Configurar Plan de Evaluación' para esta asignatura y lapso antes de guardar calificaciones.", { duration: 6000 });
        return;
      }
      toast.error('Error al guardar las calificaciones en la base de datos: ' + getErrorMessage(e, 'Error desconocido'));
      throw e;
    }
  };

  const handleUpdateEvaluationPlan = async (subId: string, year: number, section: string, lap: 1 | 2 | 3, evaluations: any[]) => {
    try {
      const plan = studyPlans.find(p => p.subjectId === subId && Number(p.year) === year);
      if (!plan) throw new Error("Plan de estudio no encontrado para esta materia y año");

      const realPlanId = Number(plan.id);

      const seccion = sections.find(s => s.grade === year && s.letter === section);
      const realSectionId = seccion ? Number(seccion.id) : 1;
      
      const activePeriod = periods.find(p => p.status === 'Activo');
      let realMomentoId: number = lap;
      if (activePeriod && activePeriod.momentos && activePeriod.momentos.length > 0) {
        const sortedMomentos = [...activePeriod.momentos].sort((a, b) => a.id_momento - b.id_momento);
        if (sortedMomentos[lap - 1]) {
          realMomentoId = sortedMomentos[lap - 1].id_momento;
        }
      }

      const payload = {
        id_plan: realPlanId,
        id_seccion: realSectionId,
        id_momento: realMomentoId,
        evaluaciones: evaluations.map(e => ({
          id_evaluacion: e.id && !String(e.id).includes('-') ? Number(e.id) : null,
          descripcion: e.name,
          ponderacion: e.percentage
        }))
      };

      const result = await api.post<any[]>('/api/evaluaciones/planes', payload);

      // Update local state with real IDs from DB
      setEvaluationPlans(p => {
        const copy = [...p];
        const idx = copy.findIndex(pl => pl.subjectId === subId && pl.year === year && pl.section === section && pl.lapso === lap);

        const mappedEvs = result.map((r: any) => ({
          id: String(r.id_evaluacion),
          name: r.descripcion,
          percentage: r.ponderacion
        }));

        if (idx >= 0) {
          copy[idx] = { ...copy[idx], evaluations: mappedEvs };
        } else {
          copy.push({ subjectId: subId, year: year as any, section, lapso: lap, evaluations: mappedEvs });
        }
        return copy;
      });

      toast.success("Plan de Evaluación guardado permanentemente en la base de datos.");
    } catch (e: any) {
      console.error(e);
      toast.error('Error al guardar el plan de evaluación: ' + getErrorMessage(e, 'Error de conexión'));
    }
  };

  const refreshGrades = useCallback(async () => {
    try {
      const activePeriodId = periods.find(p => p.status === 'Activo')?.id;
      const periodoParam = activePeriodId ? `?id_periodo=${activePeriodId}` : '';

      const [calificacionesData, planesResp, notasResp, auditoriaData] = await Promise.all([
        api.get<any[]>(`/api/calificaciones${periodoParam}`),
        api.get<any[]>(`/api/evaluaciones/planes${periodoParam}`).catch(() => ({ data: [] })),
        api.get<any[]>(`/api/evaluaciones/notas${periodoParam}`).catch(() => ({ data: [] })),
        api.get<any[]>('/api/auditorias').catch(() => []),
      ]);

      const seccionesMap = sections.reduce((acc: Record<number, any>, s) => {
        acc[Number(s.id)] = { letra: s.letter };
        return acc;
      }, {});

      const dbEvaluationsList = (Array.isArray((planesResp as any)?.data) ? (planesResp as any).data : (Array.isArray(planesResp) ? planesResp : [])) || [];
      setEvaluationPlans(mapEvaluacionesDbToPlans(dbEvaluationsList, studyPlans, seccionesMap));

      const dbNotasParciales = (Array.isArray((notasResp as any)?.data) ? (notasResp as any).data : (Array.isArray(notasResp) ? notasResp : [])) || [];
      if (dbNotasParciales.length > 0) {
        setGrades(dbNotasParciales.map((n: any) => mapNotaParcialToGrade(n, String(n.matricula?.id_estudiante || n.id_matricula))));
      } else {
        setGrades(calificacionesData.map((c: any) => mapCalificacionToGrade(c, String(c.matricula?.id_estudiante || c.id_matricula))));
      }

      setAuditLogs(auditoriaData.sort((a: any, b: any) => new Date(b.fecha_hora).getTime() - new Date(a.fecha_hora).getTime()));
    } catch (e) {
      console.error('Error al refrescar calificaciones:', e);
    }
  }, [sections, studyPlans, periods]);

  const refreshSchedule = useCallback(async () => {
    try {
      const horariosData = await api.get<any[]>('/api/horarios');
      setScheduleEvents(horariosData.map(mapHorarioToScheduleEvent));
    } catch (e) {
      console.error('Error al refrescar horarios:', e);
    }
  }, []);

  const refreshStudents = useCallback(async () => {
    try {
      const [estudiantesData, representantesData, matriculasData, seccionesData, periodosData] = await Promise.all([
        api.get<any[]>('/api/estudiantes'),
        api.get<any[]>('/api/representantes').catch(() => []),
        api.get<any[]>('/api/matriculas').catch(() => ({ data: [] })),
        api.get<any[]>('/api/secciones').catch(() => []),
        api.get<any[]>('/api/periodos').catch(() => ({ data: [] }))
      ]);
      const periodosList = Array.isArray(periodosData) ? periodosData : (periodosData as any)?.data || [];
      const activeDbPeriod = periodosList.find((p: any) => p.estatus === 'Activo');
      const activePeriodId = activeDbPeriod ? activeDbPeriod.id_periodo : undefined;

      const matriculasList = Array.isArray(matriculasData) ? matriculasData : (matriculasData as any)?.data || [];
      setMatriculasCache(matriculasList);
      setStudents(estudiantesData.map((s: any) => mapEstudianteToStudent(s, matriculasList, Array.isArray(seccionesData) ? seccionesData : [], activePeriodId)));
      setRepresentatives(Array.isArray(representantesData) ? representantesData : []);
    } catch (e) {
      console.error('Error al refrescar estudiantes:', e);
    }
  }, []);

  const refreshAttendance = useCallback(async () => {
    try {
      const [asistenciasData, asistenciasEstudiantesData] = await Promise.all([
        api.get<any[]>('/api/asistencias?limit=200&fecha_desde=' + daysAgo(60)).catch(() => []),
        api.get<any[]>('/api/asistencias-estudiantes?limit=500&fecha_desde=' + daysAgo(60)).catch(() => []),
      ]);

      if (Array.isArray(asistenciasData)) {
        setTeacherLogs(asistenciasData.map((a: any) => ({
          id: String(a.id_asistencia),
          teacherId: String(a.id_docente),
          date: a.fecha,
          clockInTime: a.hora_entrada,
          clockOutTime: a.hora_salida,
          status: a.estatus === 'Puntual' ? 'OnTime' : a.estatus === 'Retardo' ? 'Late' : a.estatus === 'Justificado' ? 'Justified' : 'Absent',
          justificaciones: a.justificaciones || []
        })));
      }

      if (Array.isArray(asistenciasEstudiantesData)) {
        const justificacionesData = await api.get<any[]>('/api/justificaciones-estudiantes').catch(() => []);
        const justMap = new Map<number, JustificacionEstudiante[]>();
        if (Array.isArray(justificacionesData)) {
          justificacionesData.forEach((j: any) => {
            const key = j.id_asistencia_est;
            if (!justMap.has(key)) justMap.set(key, []);
            justMap.get(key)!.push({
              id: j.id_justificacion_est,
              id_asistencia_est: j.id_asistencia_est,
              motivo: j.motivo || '',
              soporte_digital: j.soporte_digital || null,
              created_at: j.created_at,
            });
          });
        }
        setAttendance(asistenciasEstudiantesData.map((a: any) => ({
          id: String(a.id_asistencia_est),
          studentId: String(a.matricula?.id_estudiante || ''),
          matriculaId: String(a.id_matricula),
          date: a.fecha,
          academicYear: a.matricula?.seccion?.id_grado || 1,
          section: a.matricula?.seccion?.letra || 'A',
          status: a.estatus === 'Ausente' ? 'A' : (a.estatus === 'Justificado' ? 'J' : 'P'),
          observacion: a.observacion ? {
                id_observacion: a.observacion.id_observacion,
                texto: a.observacion.texto,
                gravedad: a.observacion.gravedad,
                id_usuario_crea: a.observacion.id_usuario_crea,
                created_at: a.observacion.created_at,
              } : undefined,
          justificaciones: justMap.get(a.id_asistencia_est) || [],
          horarioId: a.id_horario != null ? String(a.id_horario) : undefined,
        })));
      }
    } catch (e) {
      console.error('Error al refrescar asistencias:', e);
    }
  }, []);

  const resolveMatriculaId = (studentId: string, year: number, section: string): number | null => {
    const activePeriod = periods.find(p => p.status === 'Activo');
    const matchingSection = sections.find(s => s.grade === year && s.letter === section);
    if (!activePeriod || !matchingSection) return null;

    const numStudentId = Number(studentId.replace(/\D/g, '')) || Number(studentId);
    const matricula = matriculasCache.find(
      m => m.id_estudiante === numStudentId
        && m.id_periodo === Number(activePeriod.id)
        && m.id_seccion === Number(matchingSection.id)
    );
    return matricula ? matricula.id_matricula : null;
  };

  const handleModifyAttendance = async (studentId: string, date: string, year: number, section: string, status: 'P' | 'A' | 'J', horarioId?: string) => {
    try {
      const dbStatus = status === 'P' ? 'Presente' : (status === 'A' ? 'Ausente' : 'Justificado');

      // Try to get matriculaId from existing record first, then resolve from cache
      const existingAtt = attendance.find(a => a.studentId === studentId && a.date === date && a.horarioId === horarioId);
      let matriculaId: number | null = existingAtt?.matriculaId ? Number(existingAtt.matriculaId) : null;
      if (!matriculaId) {
        matriculaId = resolveMatriculaId(studentId, year, section);
      }

      if (!matriculaId) {
        console.error('No se encontró matrícula para el estudiante', studentId);
        toast.error('Error: No se encontró la matrícula del estudiante. Verifique que esté matriculado en el período activo.');
        return;
      }

      const payload: any = {
        id_matricula: matriculaId,
        fecha: date,
        estatus: dbStatus,
      };
      if (horarioId) {
        payload.id_horario = Number(horarioId);
      }

      if (existingAtt && existingAtt.id.startsWith('att-')) {
        const created = await api.post<any>('/api/asistencias-estudiantes', payload);
        const newId = String(created.id_asistencia_est || created.id);
        setAttendance(p => {
          const idx = p.findIndex(a => a.studentId === studentId && a.date === date && a.horarioId === horarioId);
          if (idx >= 0) {
            const copy = [...p];
            copy[idx] = { ...copy[idx], status, id: newId, matriculaId: String(matriculaId), horarioId: horarioId || copy[idx].horarioId };
            return copy;
          }
          return [...p, { id: newId, studentId, matriculaId: String(matriculaId), date, academicYear: year as any, section, status, horarioId }];
        });
        toast.success('Asistencia guardada');
      } else if (existingAtt) {
        const realId = existingAtt.id.replace(/^[a-zA-Z]+-/, '');
        await api.patch(`/api/asistencias-estudiantes/${realId}`, { estatus: dbStatus, ...(horarioId ? { id_horario: Number(horarioId) } : {}) });
        setAttendance(p => p.map(a => a.id === existingAtt.id ? { ...a, status, matriculaId: String(matriculaId), horarioId: horarioId || a.horarioId } : a));
        toast.success('Asistencia guardada');
      } else {
        const created = await api.post<any>('/api/asistencias-estudiantes', payload);
        const newId = String(created.id_asistencia_est || created.id);
        setAttendance(p => [...p, { id: newId, studentId, matriculaId: String(matriculaId), date, academicYear: year as any, section, status, horarioId }]);
        toast.success('Asistencia guardada');
      }
    } catch (e: any) {
      console.error('Error al guardar asistencia estudiantil', e);
      toast.error('Error al guardar asistencia: ' + getErrorMessage(e));
    }
  };

  const handleSaveAllAttendance = async (
    dirtyRecords: DirtyAttendanceRecord[],
    date: string,
    year: number,
    section: string,
    subjectId: string
  ): Promise<boolean> => {
    try {
      const studentToMatricula = new Map<string, number>();
      const registros = dirtyRecords.map(r => {
        const existingAtt = attendance.find(
          a => a.studentId === r.studentId && a.date === date &&
            (subjectId ? a.horarioId === subjectId : !a.horarioId)
        );
        let matriculaId: number | null = existingAtt?.matriculaId ? Number(existingAtt.matriculaId) : null;
        if (!matriculaId) {
          matriculaId = resolveMatriculaId(r.studentId, year, section);
        }
        if (matriculaId) {
          studentToMatricula.set(r.studentId, matriculaId);
        }
        const dbStatus = r.status === 'P' ? 'Presente' : r.status === 'A' ? 'Ausente' : 'Justificado';
        const payload: any = {
          id_matricula: matriculaId,
          fecha: date,
          estatus: dbStatus,
        };
        if (subjectId) {
          payload.id_horario = Number(subjectId);
        }
        if (r.observacion) {
          payload.observacion = r.observacion;
        }
        if (r.justificacion) {
          payload.justificacion = r.justificacion;
        }
        return { studentId: r.studentId, status: r.status, payload };
      });

      const validRegistros = registros
        .filter(r => r.payload.id_matricula != null)
        .map(r => r.payload);

      if (validRegistros.length === 0) {
        toast.error('No se pudieron resolver las matrículas de los estudiantes.');
        return false;
      }

      await api.post<any>('/api/asistencias-estudiantes/batch', { registros: validRegistros });

      setAttendance(prev => {
        const next = [...prev];
        for (const { studentId, status } of registros) {
          if (!studentToMatricula.has(studentId)) continue;
          const mid = studentToMatricula.get(studentId)!;
          const existingIdx = next.findIndex(a =>
            a.studentId === studentId && a.date === date &&
            (subjectId ? a.horarioId === subjectId : !a.horarioId)
          );
          const newAtt: Attendance = {
            id: `saved-${studentId}-${Date.now()}`,
            studentId,
            matriculaId: String(mid),
            date,
            academicYear: year as any,
            section,
            status,
            horarioId: subjectId || undefined,
          };
          if (existingIdx >= 0) {
            next[existingIdx] = newAtt;
          } else {
            next.push(newAtt);
          }
        }
        return next;
      });

      await refreshAttendance();
      return true;
    } catch (e: any) {
      console.error('Error al guardar asistencias en batch', e);
      toast.error('Error al guardar asistencias: ' + getErrorMessage(e));
      return false;
    }
  };

  const handleJustifyStudentAbsence = async (attendanceId: string | null, motivo: string, soporteDigital?: string, studentId?: string, fecha?: string, horarioId?: string): Promise<boolean> => {
    try {
      const existingAtt = attendanceId ? attendance.find(a => a.id === attendanceId) : null;
      const existingJust = existingAtt?.justificaciones?.[0];

      if (existingJust) {
        await api.patch<any>(`/api/justificaciones-estudiantes/${existingJust.id}`, { motivo, soporte_digital: soporteDigital || undefined });
        setAttendance(p => p.map(a => {
          if (a.id === attendanceId) {
            return {
              ...a,
              status: 'J' as const,
              justificaciones: (a.justificaciones || []).map(j =>
                j.id === existingJust.id ? { ...j, motivo, soporte_digital: soporteDigital || null } : j
              ),
            };
          }
          return a;
        }));
      } else {
        const payload: any = { motivo };
        if (soporteDigital) payload.soporte_digital = soporteDigital;

        if (attendanceId && existingAtt && !attendanceId.startsWith('temp-')) {
          payload.id_asistencia_est = Number(attendanceId.replace(/^[a-zA-Z]+-/, ''));
        } else if (studentId && fecha) {
          payload.id_estudiante = Number(studentId.replace(/\D/g, '') || studentId);
          payload.fecha = fecha;
          if (horarioId) payload.id_horario = Number(horarioId);
        }

        const resp = await api.post<any>('/api/justificaciones-estudiantes', payload);
        const justData = resp.data?.data || resp.data;
        const asistenciaData = resp.data?.asistencia;
        const newJust: JustificacionEstudiante = {
          id: justData?.id_justificacion_est || justData?.id,
          id_asistencia_est: asistenciaData?.id_asistencia_est || (attendanceId ? Number(attendanceId.replace(/^[a-zA-Z]+-/, '')) : 0),
          motivo,
          soporte_digital: soporteDigital || null,
          created_at: justData?.created_at || new Date().toISOString(),
        };

        if (asistenciaData) {
          setAttendance(prev => {
            const exists = prev.some(a => a.id === String(asistenciaData.id_asistencia_est));
            const estudiante = asistenciaData.matricula?.estudiante;
            const seccion = asistenciaData.matricula?.seccion;
            const newAtt: Attendance = {
              id: String(asistenciaData.id_asistencia_est),
              studentId: studentId || (estudiante ? String(estudiante.id_estudiante) : ''),
              matriculaId: String(asistenciaData.id_matricula),
              date: asistenciaData.fecha,
              academicYear: (seccion?.id_grado || 5) as AcademicYear,
              section: seccion?.letra || seccion?.nombre?.charAt(0) || 'A',
              status: 'J',
              horarioId: asistenciaData.id_horario ? String(asistenciaData.id_horario) : undefined,
              justificaciones: [newJust],
            };
            if (exists) {
              return prev.map(a => a.id === String(asistenciaData.id_asistencia_est) ? { ...a, status: 'J' as const, justificaciones: [...(a.justificaciones || []), newJust] } : a);
            }
            return [...prev, newAtt];
          });
        } else if (attendanceId) {
          setAttendance(p => p.map(a => {
            if (a.id === attendanceId) {
              return { ...a, status: 'J' as const, justificaciones: [...(a.justificaciones || []), newJust] };
            }
            return a;
          }));
        }
      }
      toast.success('Justificación registrada');
      return true;
    } catch (e: any) {
      console.error('Error al crear justificación estudiante', e);
      toast.error('Error al justificar: ' + getErrorMessage(e));
      return false;
    }
  };

  const handleSaveObservacion = async (attendanceId: string, texto: string, gravedad?: string): Promise<boolean> => {
    try {
      const realId = Number(attendanceId.replace(/^[a-zA-Z]+-/, ''));
      const existingAtt = attendance.find(a => a.id === attendanceId);
      const existingObs = existingAtt?.observacion;

      if (existingObs) {
        await api.patch(`/api/observaciones-estudiantes/${existingObs.id_observacion}`, { texto, gravedad: gravedad || undefined });
        setAttendance(p => p.map(a => a.id === attendanceId ? { ...a, observacion: { ...existingObs, texto, gravedad: gravedad as any || existingObs.gravedad } } : a));
      } else {
        const created = await api.post<any>('/api/observaciones-estudiantes', { texto, gravedad: gravedad || undefined });
        await api.patch(`/api/asistencias-estudiantes/${realId}`, { id_observacion: created.id_observacion });
        setAttendance(p => p.map(a => a.id === attendanceId ? { ...a, observacion: { id_observacion: created.id_observacion, texto, gravedad: gravedad as any || null, id_usuario_crea: null, created_at: created.created_at } } : a));
      }
      toast.success('Observación guardada');
      return true;
    } catch (e: any) {
      console.error('Error al guardar observación', e);
      toast.error('Error al guardar observación: ' + getErrorMessage(e));
      return false;
    }
  };

  const handleAddTeacherLog = async (log: TeacherScheduleLog) => {
    try {
      const idDocente = Number(log.teacherId);
      const payload = {
        id_docente: idDocente,
        fecha: log.date,
        hora_entrada: log.clockInTime,
      };
      const created = await api.post<any>('/api/asistencias', payload);
      const serverStatus = created?.estatus === 'Puntual' ? 'OnTime' : created?.estatus === 'Retardo' ? 'Late' : 'Absent';
      setTeacherLogs(p => [{ ...log, id: String(created.id_asistencia || created.id), status: serverStatus }, ...p]);
    } catch (e: any) {
      console.error('Error al registrar entrada:', e);
      toast.error('Error al registrar entrada: ' + getErrorMessage(e));
    }
  };

  const handleSyncInasistencias = async (ids_matricula: string[]) => {
    if (ids_matricula.length === 0) return;
    try {
      const result = await api.post<any>(`/api/asistencias-estudiantes/sync-inasistencias-batch`, { ids_matricula });
      console.log('Inasistencias sincronizadas:', result);
      toast.success(`Inasistencias sincronizadas correctamente para ${ids_matricula.length} estudiante(s).`);
    } catch (e: any) {
      console.error('Error al sincronizar inasistencias', e);
      toast.error('Error al sincronizar inasistencias: ' + getErrorMessage(e));
    }
  };

  const handleUpdateTeacherLog = async (logId: string, clockOut: string) => {
    try {
      const id = Number(logId.replace(/\D/g, ''));
      if (id) {
        await api.patch(`/api/asistencias/${id}`, { hora_salida: clockOut });
      }
    } catch (e: any) {
      console.error('Error al registrar salida:', e);
      toast.error('Error al registrar salida: ' + getErrorMessage(e));
      return;
    }
    setTeacherLogs(p => p.map(l => l.id === logId ? { ...l, clockOutTime: clockOut } : l));
  };

  const handleDeleteAttendance = async (attendanceId: string) => {
    try {
      const realId = attendanceId.replace(/^[a-zA-Z]+-/, '');
      await api.delete(`/api/asistencias-estudiantes/${realId}`);
      setAttendance(p => p.filter(a => a.id !== attendanceId));
      toast.success('Registro de asistencia eliminado');
    } catch (e: any) {
      console.error('Error al eliminar asistencia:', e);
      toast.error('Error al eliminar: ' + getErrorMessage(e));
    }
  };

  const fetchMiHorario = useCallback(async (fecha?: string) => {
    try {
      const date = fecha || new Date().toISOString().split('T')[0];
      const resp = await api.get<any>(`/api/horarios/mi-horario?fecha=${date}`);
      const data = Array.isArray(resp) ? resp : (resp as any)?.data || [];
      setMiHorario(data.map((h: any) => ({
        ...h,
        id_horario: h.id_horario,
        estudiantes: h.estudiantes || [],
        asignatura: h.asignatura ? { id: String(h.asignatura.id_asignatura), name: h.asignatura.nombre, shortName: h.asignatura.nombre?.substring(0, 3).toUpperCase(), years: [] } : null,
        seccion: h.seccion ? {
          ...h.seccion,
          id: String(h.seccion.id_seccion),
          grade: h.seccion.id_grado,
          letter: h.seccion.letra,
        } : h.seccion,
        aula: h.aula ? {
          ...h.aula,
          id: String(h.aula.id_aula),
          name: h.aula.nombre_codigo,
        } : h.aula,
      })));
    } catch (e) {
      console.error('Error al cargar mi horario:', e);
    }
  }, []);

  const fetchHorariosDisponibles = useCallback(async (params?: { id_docente?: string; fecha?: string }) => {
    try {
      const query = new URLSearchParams();
      if (params?.id_docente) query.set('id_docente', params.id_docente);
      if (params?.fecha) query.set('fecha', params.fecha);
      const resp = await api.get<any>(`/api/horarios/disponibles?${query.toString()}`);
      const data = Array.isArray(resp) ? resp : (resp as any)?.data || [];
      setHorariosDisponibles(data);
    } catch (e) {
      console.error('Error al cargar horarios disponibles:', e);
    }
  }, []);

  const handleJustifyTeacherAbsence = async (logId: string, motivo: string, soporteDigital?: string) => {
    try {
      const idAsistencia = Number(logId.replace(/\D/g, ''));
      if (idAsistencia) {
        const payload: any = { id_asistencia: idAsistencia, motivo };
        if (soporteDigital) payload.soporte_digital = soporteDigital;

        const resp = await api.post<any>('/api/justificaciones', payload);
        const newJustificacion = resp.data;

        setTeacherLogs(p => p.map(l => {
          if (l.id === logId) {
            const currentJusts = l.justificaciones || [];
            return {
              ...l,
              status: 'Justified',
              justificaciones: [...currentJusts, newJustificacion]
            };
          }
          return l;
        }));

        return true;
      }
      return false;
    } catch (e: any) {
      console.error('Error al registrar justificación:', e);
      toast.error('Error al registrar justificación: ' + getErrorMessage(e));
      return false;
    }
  };

  const handleAddScheduleEvent = async (evt: ScheduleEvent) => {
    try {
      const dayObj = referenceData.dias.find((d: any) => d.nombre === evt.day);
      const dayMap: Record<string, number> = { Lunes: 1, Martes: 2, Miércoles: 3, Jueves: 4, Viernes: 5 };
      const idDia = dayObj?.id_dia || dayMap[evt.day] || 1;
      const bloque = referenceData.bloques.find((b: any) =>
        `${b.hora_inicio} - ${b.hora_fin}` === evt.timeBlock ||
        `${b.hora_inicio.substring(0, 5)} - ${b.hora_fin.substring(0, 5)}` === evt.timeBlock
      );
      const idBloque = bloque?.id_bloque || Number(evt.timeBlock.split(':')[0]) || 1;
      const seccion = sections.find(s => s.grade === evt.year && s.letter === evt.section);
      const user = users.find(u => u.id === evt.teacherId);
      const idDocente = user?.teacherId ? Number(user.teacherId) : Number(evt.teacherId.replace(/\D/g, '')) || 1;

      const payload = {
        id_docente: idDocente,
        id_asignatura: Number(evt.subjectId.replace(/\D/g, '')) || Number(evt.subjectId),
        id_seccion: seccion ? Number(seccion.id) : 1,
        id_dia: idDia,
        id_bloque: idBloque,
        id_aula: Number(evt.classroomId.replace(/\D/g, '')) || Number(evt.classroomId),
      };

      const created = await api.post<any>('/api/horarios', payload);
      setScheduleEvents(prev => [...prev, mapHorarioToScheduleEvent(created)]);
    } catch (e: any) {
      console.error('Error al crear horario:', e);
      toast.error('Error al guardar horario en BD: ' + getErrorMessage(e, 'Error desconocido'));
    }
  };

  const handleUpdateScheduleEvent = async (evtId: string, evt: Partial<ScheduleEvent>) => {
    try {
      const id = Number(evtId.replace(/\D/g, ''));
      if (!id) return;

      const payload: any = {};
      if (evt.day) {
        const dayObj = referenceData.dias.find((d: any) => d.nombre === evt.day);
        const dayMap: Record<string, number> = { Lunes: 1, Martes: 2, Miércoles: 3, Jueves: 4, Viernes: 5 };
        payload.id_dia = dayObj?.id_dia || dayMap[evt.day] || 1;
      }
      if (evt.timeBlock) {
        const bloque = referenceData.bloques.find((b: any) =>
          `${b.hora_inicio} - ${b.hora_fin}` === evt.timeBlock ||
          `${b.hora_inicio.substring(0, 5)} - ${b.hora_fin.substring(0, 5)}` === evt.timeBlock
        );
        payload.id_bloque = bloque?.id_bloque || Number(evt.timeBlock.split(':')[0]) || 1;
      }
      if (evt.year && evt.section) {
        const seccion = sections.find(s => s.grade === evt.year && s.letter === evt.section);
        payload.id_seccion = seccion ? Number(seccion.id) : 1;
      }
      if (evt.subjectId) payload.id_asignatura = Number(evt.subjectId.replace(/\D/g, '')) || Number(evt.subjectId);
      if (evt.classroomId) payload.id_aula = Number(evt.classroomId.replace(/\D/g, '')) || Number(evt.classroomId);
      if (evt.teacherId) {
        const user = users.find(u => u.id === evt.teacherId);
        payload.id_docente = user?.teacherId ? Number(user.teacherId) : Number(evt.teacherId.replace(/\D/g, '')) || 1;
      }

      const updated = await api.patch<any>(`/api/horarios/${id}`, payload);
      setScheduleEvents(prev => prev.map(e => e.id === String(id) ? mapHorarioToScheduleEvent(updated) : e));
    } catch (e: any) {
      console.error('Error al actualizar horario:', e);
      toast.error('Error al actualizar horario en BD: ' + getErrorMessage(e, 'Error desconocido'));
    }
  };

  const handleRemoveScheduleEvent = async (evtId: string) => {
    try {
      const id = Number(evtId.replace(/\D/g, ''));
      if (id) {
        await api.delete(`/api/horarios/${id}`);
        setScheduleEvents(prev => prev.filter(e => e.id !== String(id)));
        toast.success('Asignación eliminada con éxito');
      }
    } catch (e: any) {
      console.error('Error al eliminar horario:', e);
      toast.error('Error al eliminar asignación: ' + getErrorMessage(e, 'Error desconocido'));
    }
  };

  const handleAddClassroom = async (room: Classroom) => {
    const res = await api.post<any>('/api/aulas', {
      nombre_codigo: room.name,
      capacidad: room.capacity,
      tipo_espacio: room.type,
      ubicacion: room.location,
      estatus: 'Activo'
    });
    if (res?.data) {
      setClassrooms(prev => [mapAulaToClassroom(res.data), ...prev]);
    }
  };

  const handleEditClassroom = async (roomId: string, data: Partial<Classroom>) => {
    const id = Number(roomId.replace(/\D/g, ''));
    if (id) {
      const payload: any = {};
      if (data.name) payload.nombre_codigo = data.name;
      if (data.capacity) payload.capacidad = data.capacity;
      if (data.type) payload.tipo_espacio = data.type;
      if (data.location !== undefined) payload.ubicacion = data.location;

      const res = await api.patch<any>(`/api/aulas/${id}`, payload);
      if (res?.data) {
        setClassrooms(prev => prev.map(c =>
          c.id === String(id) ? mapAulaToClassroom(res.data) : c
        ));
      }
    }
  };

  const handleRemoveClassroom = async (roomId: string) => {
    const id = Number(roomId.replace(/\D/g, ''));
    if (id) {
      await api.delete(`/api/aulas/${id}`);
      setClassrooms(prev => prev.filter(c => c.id !== String(id)));
    }
  };

  // Tabs structure definitions grouped hierarchically
  const tabGroups = [
    {
      group: 'Principal',
      items: [
        { id: 'dashboard', label: 'Indicadores', icon: LayoutDashboard, allowedRoles: ['super_admin', 'control_estudios'] }
      ]
    },
    {
      group: 'Configuración Inicial',
      items: [
        { id: 'periods', label: 'Periodos Escolares', icon: CalendarDays, allowedRoles: ['super_admin', 'control_estudios'] },
        { id: 'users', label: 'Usuarios', icon: Shield, allowedRoles: ['super_admin'] },
        { id: 'facilities', label: 'Salones y Aulas', icon: Home, allowedRoles: ['super_admin', 'control_estudios'] }
      ]
    },
    {
      group: 'Planificación Académica',
      items: [
        { id: 'subjects', label: 'Plan de Estudio', icon: Book, allowedRoles: ['super_admin', 'control_estudios'] },
        { id: 'schedule', label: 'Programacion Horaria', icon: ClipboardCheck, allowedRoles: ['super_admin', 'control_estudios', 'docente', 'coordinador'] }
      ]
    },
    {
      group: 'Organización Escolar',
      items: [
        { id: 'academic', label: 'Gestión de Secciones', icon: GraduationCap, allowedRoles: ['super_admin', 'control_estudios'] },
        { id: 'students', label: 'Estudiantes', icon: Users, allowedRoles: ['super_admin', 'control_estudios', 'coordinador'] }
      ]
    },
    {
      group: 'Formatos',
      items: [
        { id: 'formats', label: 'Edición Formatos', icon: FileEdit, allowedRoles: ['super_admin', 'control_estudios'] }
      ]
    },
    {
      group: 'Operaciones Diarias',
      items: [
        { id: 'grades', label: 'Calificaciones', icon: Award, allowedRoles: ['super_admin', 'control_estudios', 'coordinador', 'docente'] },
        { id: 'attendance', label: 'Control Asistencia', icon: Calendar, allowedRoles: ['super_admin', 'control_estudios', 'coordinador', 'docente'] },
        { id: 'pendientes', label: 'Materias Pendientes', icon: BookOpen, allowedRoles: ['super_admin', 'control_estudios'] }
      ]
    },
    {
      group: 'Sistema',
      items: [
        { id: 'documentation', label: 'Documentación', icon: BookOpen, allowedRoles: ['super_admin', 'control_estudios', 'docente'] }
      ]
    }
  ];

  const filteredTabGroups = tabGroups
    .map(group => ({
      ...group,
      items: group.items.filter(item => item.allowedRoles.includes(currentUserRole))
    }))
    .filter(group => group.items.length > 0);

  // Flattened for easy lookup if needed
  const tabs = filteredTabGroups.flatMap(g => g.items);

  // Helper definitions for side-roles indicators
  const getRoleLabelAndColor = (role: UserRole) => {
    switch (role) {
      case 'super_admin':
        return { label: 'Director Principal', color: 'bg-red-600 text-white border-red-500' };
      case 'control_estudios':
        return { label: 'Ctrl de Estudios', color: 'bg-indigo-600 text-white border-indigo-500' };
      case 'coordinador':
        return { label: 'Coordinador', color: 'bg-amber-600 text-white border-amber-500' };
      case 'docente':
        return { label: 'Profesor / Docencia', color: 'bg-emerald-600 text-white border-emerald-500' };
    }
  };

  const { label: currentRoleLabel, color: currentRoleColor } = getRoleLabelAndColor(currentUserRole);

  // --- Computed values needed before early return (hooks rules) ---
  const isDocente = currentUserRole === 'docente';
  const teacherId = currentUser?.id;
  const activePeriod = periods.find(p => p.status === 'Activo');
  const sectionsForSchedule = activePeriod
    ? sections.filter(s => String(s.periodId) === String(activePeriod.id))
    : sections;
  const sectionsForGrades = sectionsForSchedule;

  // Docente filtering: same approach as AttendanceTracker — filter by teacher's schedule
  const teacherScheduleKeys = useMemo(() => {
    if (!isDocente || !teacherId) return { subjectIds: new Set<string>(), sectionKeys: new Set<string>() };
    const subjectIds = new Set<string>();
    const sectionKeys = new Set<string>();
    scheduleEvents.forEach(e => {
      if (String(e.teacherId) === String(teacherId)) {
        subjectIds.add(String(e.subjectId));
        sectionKeys.add(`${e.year}-${e.section}`);
      }
    });
    return { subjectIds, sectionKeys };
  }, [isDocente, teacherId, scheduleEvents]);

  const gradeSubjects = useMemo(
    () => isDocente ? subjects.filter(s => teacherScheduleKeys.subjectIds.has(String(s.id))) : subjects,
    [isDocente, subjects, teacherScheduleKeys.subjectIds]
  );
  const gradeSections = useMemo(
    () => isDocente ? sectionsForSchedule.filter(s => teacherScheduleKeys.sectionKeys.has(`${s.grade}-${s.letter}`)) : sectionsForSchedule,
    [isDocente, sectionsForSchedule, teacherScheduleKeys.sectionKeys]
  );
  const gradeStudents = useMemo(() => {
    if (!isDocente) return students;
    const baseStudents = students.filter(s => teacherScheduleKeys.sectionKeys.has(`${s.academicYear}-${s.section}`));
    const baseIds = new Set(baseStudents.map(s => s.id));
    const pendingStudentIds = new Set<string>();
    for (const mp of materiasPendientes) {
      if (mp.estatus === 'Cursando' && teacherScheduleKeys.subjectIds.has(String(mp.id_asignatura))) {
        pendingStudentIds.add(String(mp.id_estudiante));
      }
    }
    if (pendingStudentIds.size === 0) return baseStudents;
    const extraStudents = students.filter(s => pendingStudentIds.has(s.id) && !baseIds.has(s.id));
    return [...baseStudents, ...extraStudents];
  }, [isDocente, students, teacherScheduleKeys.sectionKeys, teacherScheduleKeys.subjectIds, materiasPendientes]);
  const gradeEvaluationPlans = useMemo(
    () => isDocente ? evaluationPlans.filter(p => teacherScheduleKeys.subjectIds.has(String(p.subjectId))) : evaluationPlans,
    [isDocente, evaluationPlans, teacherScheduleKeys.subjectIds]
  );
  const gradeGrades = useMemo(
    () => isDocente ? grades.filter(g => teacherScheduleKeys.subjectIds.has(String(g.subjectId))) : grades,
    [isDocente, grades, teacherScheduleKeys.subjectIds]
  );

  const teacherSubjectsBySection = useMemo(() => {
    if (!isDocente || !teacherId) return undefined;
    const map: Record<string, string[]> = {};
    scheduleEvents.forEach(e => {
      if (String(e.teacherId) === String(teacherId)) {
        const key = `${e.year}-${e.section}`;
        if (!map[key]) map[key] = [];
        if (!map[key].includes(String(e.subjectId))) {
          map[key].push(String(e.subjectId));
        }
      }
    });
    return map;
  }, [isDocente, teacherId, scheduleEvents]);

  // Load materias pendientes for the active period
  useEffect(() => {
    if (isLoggedIn && activePeriod?.id) {
      api.get<any[]>('/api/materias-pendientes').then(data => {
        const parsed = Array.isArray(data) ? data : (data as any)?.data || [];
        setMateriasPendientes(parsed);
      }).catch(e => console.error('Error cargando materias pendientes en App:', e));
    }
  }, [isLoggedIn, activePeriod?.id]);

  if (!isLoggedIn) {
    return <LoginScreen users={users} onLogin={handleLogin} />;
  }

  const CHATBOT_ROLE_MAP: Record<UserRole, number> = {
    super_admin: 1,
    control_estudios: 2,
    coordinador: 3,
    docente: 4,
  };

  return (
    <div id="mppe-app-root" className="h-screen overflow-hidden bg-slate-50/60 font-sans antialiased text-slate-800 flex flex-col">
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: { fontSize: '13px', fontWeight: 'bold', borderRadius: '12px' },
          success: { style: { background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' } },
          error: { style: { background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' }, duration: 6000 }
        }}
      />

      <div id="simulated-header-badge" className="hidden md:flex bg-slate-900 text-slate-300 py-3 px-6 text-center font-sans items-center justify-between border-b border-slate-800 shadow-sm z-10">
        <div className="flex items-center gap-2 bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-xl px-4 py-2 mx-auto md:mx-0 shadow-sm transition-all hover:bg-slate-800/60">
          <span className="text-lg drop-shadow-sm">👋</span> 
          <span className="text-sm font-medium text-slate-300">
            Bienvenido de nuevo, <strong className="text-slate-100 font-bold capitalize tracking-wide">{currentUser?.name?.replace(/usuario/i, '').trim() || 'Usuario'}</strong>
          </span>
        </div>
        <span className="hidden md:flex items-center gap-4">
          {activePeriod && (
            <div className="inline-flex items-center gap-2 bg-slate-800/80 backdrop-blur-md border border-slate-700/50 px-3 py-1.5 rounded-full text-sm font-bold tracking-wider uppercase shadow-sm font-sans">
              <Sparkles className="w-4.5 h-4.5 text-blue-400" />
              <span className="text-blue-50">Año Escolar Activo: {activePeriod.name}</span>
            </div>
          )}
          <VenezuelaClock />
        </span>
      </div>

      {/* Main Container Layout */}
      <div id="mppe-main-layout" className="flex-1 min-h-0 flex flex-col md:flex-row">

        {/* SIDEBAR FOR DESKTOP */}
        <aside id="mppe-sidebar" className="hidden md:flex w-64 bg-slate-900 text-slate-300 shrink-0 flex-col justify-between border-r border-slate-800 z-20 select-none relative">
          <div id="sidebar-top" className="flex-1 flex flex-col min-h-0 pt-6">

            {/* Brand Logo Banner */}
            <div id="mppe-logo-banner" className="px-5 mb-8 flex items-center gap-3 shrink-0 relative mt-2">
              <div className="absolute left-3 top-0 w-10 h-10 bg-blue-500/30 blur-xl rounded-full"></div>

              <div className="h-11 w-11 bg-white rounded-xl shadow-lg shadow-blue-500/20 flex items-center justify-center border border-white/10 relative z-10 overflow-hidden p-0.5">
                <img src="./logo_leo.jpg" alt="Logo LEO" className="h-full w-full object-contain rounded-lg" />
              </div>

              <div className="relative z-10 min-w-0">
                <span className="block font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-300 text-base tracking-widest uppercase leading-none mb-1">
                  Estilita Orozco
                </span>
                <span className="block text-[8.5px] text-indigo-300/80 font-bold uppercase tracking-widest leading-tight">
                  Liceo Nacional
                </span>
              </div>
            </div>

            {/* Navigation options */}
            <nav id="sidebar-nav" className="px-3 pb-6 flex-1 overflow-y-auto scrollbar-hide">
              {filteredTabGroups.map((group, idx) => (
                <div key={idx} className="mb-6 last:mb-0">
                  <h3 className="px-3 mb-2 text-xs font-black text-slate-500 uppercase tracking-widest">
                    {group.group}
                  </h3>
                  <div className="space-y-1">
                    {group.items.map(tab => {
                      const isActive = activeTab === tab.id;
                      const Icon = tab.icon;

                      return (
                        <button
                          id={`sidebar-tab-${tab.id}`}
                          key={tab.id}
                          onClick={() => {
                            setActiveTab(tab.id);
                            setIsMobileMenuOpen(false);
                          }}
                          className={`w-full py-2.5 px-3.5 rounded-xl text-sm font-bold font-sans transition-all flex items-center justify-between pointer-events-auto cursor-pointer ${isActive
                            ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                            : 'hover:bg-slate-800 hover:text-slate-100 text-slate-400'
                            }`}
                        >
                          <span className="flex items-center gap-3">
                            <Icon className="h-4.5 w-4.5 shrink-0" />
                            <span>{tab.label}</span>
                          </span>
                          {isActive && <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </div>

          {/* Quick Resets and Logout simulation */}
          <div id="sidebar-footer" className="p-4 border-t border-slate-800/60 space-y-3">
            {/* Simulated Active Account */}
            <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/50 flex flex-col gap-3">
              <button
                onClick={() => setIsProfileOpen(true)}
                className="flex items-center gap-2.5 overflow-hidden w-full text-left pointer-events-auto cursor-pointer hover:bg-slate-700/30 rounded-lg p-1.5 -m-1.5 transition-colors"
              >
                <div className="h-9 w-9 shrink-0 rounded-full bg-blue-500/20 flex items-center justify-center font-bold text-blue-400 border border-blue-500/30 uppercase overflow-hidden">
                  {currentUser?.avatarUrl ? (
                    <img src={currentUser.avatarUrl} alt={currentUser.name} className="h-full w-full object-cover" />
                  ) : (
                    currentUserRole.substring(0, 2)
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block text-white font-bold text-sm leading-none truncate mb-1">
                    {currentUser?.name || 'Usuario'}
                  </span>
                  <span className="block text-sm text-slate-400 font-bold uppercase tracking-tight truncate">{currentRoleLabel}</span>
                </div>
              </button>

              {currentUserRole === 'super_admin' && (
                <button
                  onClick={handleBackup}
                  disabled={isBackingUp}
                  aria-busy={isBackingUp}
                  className={`w-full py-1.5 px-3 text-white text-[11px] font-bold uppercase tracking-wide rounded-lg shadow-sm transition-all pointer-events-auto flex justify-center items-center gap-2 ${isBackingUp
                    ? 'bg-slate-600/50 cursor-not-allowed border border-slate-500/30'
                    : 'bg-slate-700/80 hover:bg-slate-600 border border-slate-600/50 cursor-pointer'
                  }`}
                >
                  {isBackingUp ? (
                    <>
                      <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Respaldando...
                    </>
                  ) : (
                    <>
                      <Database className="h-3.5 w-3.5 text-blue-400" /> Respaldo DB (.sql)
                    </>
                  )}
                </button>
              )}

              <button
                onClick={handleLogout}
                className="w-full py-1.5 px-3 bg-rose-600/90 hover:bg-rose-500 text-white text-xs font-bold uppercase tracking-wide rounded-lg shadow-sm border border-rose-500/50 transition-all pointer-events-auto cursor-pointer flex justify-center items-center gap-2"
              >
                <LogOut className="h-3.5 w-3.5" /> Cerrar Sesión
              </button>
            </div>


          </div>
        </aside>

        {/* MOBILE MENU NAV HEADER */}
        <header id="mobile-nav-header" className="md:hidden bg-slate-900 text-slate-300 p-4 border-b border-slate-800 flex items-center justify-between sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-white shadow-md shadow-blue-500/20 rounded-lg flex items-center justify-center border border-white/10 overflow-hidden">
              <img src="./logo_leo.jpg" alt="Logo LEO" className="h-full w-full object-cover" />
            </div>
            <div>
              <span className="block text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-200 uppercase tracking-widest leading-none mb-0.5">Estilita Orozco</span>
              <span className="block text-[8px] text-indigo-300/80 font-bold uppercase tracking-widest">{currentRoleLabel}</span>
            </div>
          </div>

          <button
            id="mobile-menu-toggle"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-1.5 bg-slate-800 border border-slate-700 text-slate-300 rounded pointer-events-auto cursor-pointer"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </header>

        {/* MOBILE DRAWER IF OPEN */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              key="mobile-backdrop"
              id="mobile-drawer-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-30"
              onClick={() => setIsMobileMenuOpen(false)}
            />
          )}
          {isMobileMenuOpen && (
            <motion.div
              key="mobile-drawer"
              id="mobile-menu-drawer"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="md:hidden bg-slate-900 border-b border-slate-800 text-slate-300 absolute w-full top-[61px] left-0 z-40 px-4 py-6 space-y-4 select-none shadow-2xl"
            >
              <nav className="space-y-4 overflow-y-auto scrollbar-hide max-h-[60vh] pr-2">
                {filteredTabGroups.map((group, idx) => (
                  <div key={idx} className="space-y-1">
                    <h3 className="px-3 mb-1.5 text-xs font-black text-slate-500 uppercase tracking-widest">
                      {group.group}
                    </h3>
                    {group.items.map(tab => {
                      const isActive = activeTab === tab.id;
                      const Icon = tab.icon;

                      return (
                        <button
                          id={`mobile-tab-${tab.id}`}
                          key={tab.id}
                          onClick={() => {
                            setActiveTab(tab.id);
                            setIsMobileMenuOpen(false);
                          }}
                          className={`w-full py-2.5 px-3.5 rounded-xl text-sm font-bold transition-all flex items-center gap-3 pointer-events-auto cursor-pointer ${isActive
                            ? 'bg-blue-600 text-white'
                            : 'hover:bg-slate-800 hover:text-slate-100 text-slate-400'
                            }`}
                        >
                          <Icon className="h-4.5 w-4.5" />
                          <span>{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </nav>

              <button
                onClick={() => {
                  handleLogout();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full py-2 text-center text-xs text-white font-bold uppercase bg-rose-600 hover:bg-rose-500 rounded-xl shadow-sm border border-rose-500 transition-all pointer-events-auto cursor-pointer flex justify-center items-center gap-2"
              >
                <LogOut className="h-4 w-4" /> Cerrar Sesión
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* MAIN MODULE STAGE */}
        <main id="app-stage-container" className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto scrollbar-hide block">

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="h-full block"
            >

              {/* Tab render switches */}
              {activeTab === 'dashboard' && (
                <Dashboard
                  students={students}
                  users={users}
                  attendance={attendance}
                  grades={grades.filter(g => {
                    const activeId = periods.find(p => p.status === 'Activo')?.id;
                    if (!activeId) return true;
                    return g.periodId != null && String(g.periodId) === activeId;
                  })}
                  subjects={subjects}
                  evaluationPlans={evaluationPlans}
                  onNavigateToTab={setActiveTab}
                  currentUserRole={currentUserRole}
                />
              )}

              {activeTab === 'students' && (
                <StudentManager
                  students={students}
                  sections={sections}
                  activePeriodId={activePeriod?.id}
                  classrooms={classrooms}
                  currentUserRole={currentUserRole}
                  representatives={representatives}
                  onAddStudent={handleAddStudent}
                  onUpdateStudentStatus={handleUpdateStudentStatus}
                  onUpdateStudentProfile={handleUpdateStudentProfile}
                   onNavigateToPending={(id) => {
                    if (!['super_admin', 'control_estudios'].includes(currentUserRole)) return;
                    setViewPendingStudentId(id);
                    setActiveTab('pendientes');
                  }}
                  onRefreshData={refreshStudents}
                />
              )}

              {activeTab === 'academic' && (
                <AcademicManager
                  students={students}
                  sections={sections}
                  periods={periods}
                  users={users}
                  docentes={docentes}
                  classrooms={classrooms}
                  currentUserRole={currentUserRole}
                  onAddStudent={handleAddStudent}
                  onUpdateStudentStatus={handleUpdateStudentStatus}
                  onCreateSection={handleCreateSection}
                  onUpdateSection={handleUpdateSection}
                  onDeleteSection={handleDeleteSection}
                />
              )}

              {activeTab === 'subjects' && (
                <SubjectManager
                  studyPlans={studyPlans}
                  studyPlanVersions={studyPlanVersions}
                  currentUserRole={currentUserRole}
                  onAddStudyPlanItem={handleAddStudyPlanItem}
                  onUpdateStudyPlanItem={handleUpdateStudyPlanItem}
                  onDeleteStudyPlanItem={handleDeleteStudyPlanItem}
                  onAddStudyPlanVersion={handleAddStudyPlanVersion}
                  onDeleteStudyPlanVersion={handleDeleteStudyPlanVersion}
                />
              )}

              {activeTab === 'periods' && (
                <PeriodManager
                  periods={periods}
                  currentUserRole={currentUserRole}
                  onAddPeriod={handleAddPeriod}
                  onUpdatePeriodStatus={handleUpdatePeriodStatus}
                  onUpdateMomentoStatus={handleUpdateMomentoStatus}
                  onEditPeriod={handleEditPeriod}
                  onCierreAnual={handleCierreAnual}
                  onOpenPromocion={handleOpenPromocion}
                />
              )}

              {activeTab === 'grades' && (
                <GradeManager
                  students={gradeStudents}
                  subjects={gradeSubjects}
                  evaluationPlans={gradeEvaluationPlans}
                  grades={gradeGrades}
                  auditLogs={auditLogs}
                  currentUserRole={currentUserRole}
                  studyPlans={studyPlans}
                  periods={periods}
                  sections={gradeSections}
                  teacherSubjectsBySection={teacherSubjectsBySection}
                  materiasPendientes={materiasPendientes}
                  onUpdateGrade={handleUpdateGrade}
                  onSaveGrades={handleSaveGrades}
                  onUpdateEvaluationPlan={handleUpdateEvaluationPlan}
                  onRefreshData={refreshGrades}
                />
              )}

              {activeTab === 'pendientes' && (
                <PendingSubjectsManager
                  students={students}
                  subjects={subjects}
                  periods={periods}
                  users={users}
                  docentes={docentes}
                  defaultStudentId={viewPendingStudentId}
                  refreshTrigger={pendingRefreshKey}
                />
              )}

              {activeTab === 'attendance' && (
                <AttendanceTracker
                  students={students}
                  gradeStudents={gradeStudents}
                  users={users}
                  docentes={docentes}
                  subjects={subjects}
                  sections={sectionsForSchedule}
                  periods={periods}
                  attendance={attendance}
                  teacherLogs={teacherLogs}
                  horariosDisponibles={horariosDisponibles}
                  bloques={referenceData.bloques}
                  miHorario={miHorario}
                  scheduleEvents={scheduleEvents}
                  currentUser={currentUser}
                  currentUserRole={currentUserRole}
                   onModifyAttendance={handleModifyAttendance}
                   onSaveAllAttendance={handleSaveAllAttendance}
                   onAddTeacherLog={handleAddTeacherLog}
                  onUpdateTeacherLog={handleUpdateTeacherLog}
                  onSyncInasistencias={handleSyncInasistencias}
                  onJustifyTeacherAbsence={handleJustifyTeacherAbsence}
                  onJustifyStudentAbsence={handleJustifyStudentAbsence}
                  onSaveObservacion={handleSaveObservacion}
                  onDeleteAttendance={handleDeleteAttendance}
                  onRefreshData={refreshAttendance}
                  onFetchMiHorario={fetchMiHorario}
                  onFetchHorarios={fetchHorariosDisponibles}
                />
              )}

              {activeTab === 'formats' && (
                <FormatEditor />
              )}

              {activeTab === 'schedule' && (
                <ScheduleCoordinator
                  scheduleEvents={scheduleEvents}
                  subjects={subjects.filter(s => {
                    const targetPlan = studyPlanVersions.find(v => String(v.nombre).includes('31059'));
                    const targetPlanId = targetPlan ? targetPlan.id_tipo_plan : 2;
                    return studyPlans.some(p => p.subjectId === s.id && p.id_tipo_plan === targetPlanId);
                  })}
                  studyPlans={studyPlans.filter(p => {
                    const targetPlan = studyPlanVersions.find(v => String(v.nombre).includes('31059'));
                    return p.id_tipo_plan === (targetPlan ? targetPlan.id_tipo_plan : 2);
                  })}
                  users={users}
                  docentes={docentes}
                  classrooms={classrooms}
                  sections={sectionsForSchedule}
                  referenceData={referenceData}
                  periods={periods}
                  currentUserRole={currentUserRole}
                  defaultFilterType={isDocente ? 'teacher' : 'section'}
                  defaultTeacherId={isDocente ? teacherId : undefined}
                  onAddScheduleEvent={handleAddScheduleEvent}
                  onUpdateScheduleEvent={handleUpdateScheduleEvent}
                  onRemoveScheduleEvent={handleRemoveScheduleEvent}
                  onRefreshData={refreshSchedule}
                />
              )}

              {activeTab === 'facilities' && (
                <FacilitiesManager
                  classrooms={classrooms}
                  scheduleEvents={scheduleEvents}
                  sections={sections}
                  students={students}
                  activePeriodId={periods.find(p => p.status === 'Activo')?.id}
                  currentUserRole={currentUserRole}
                  onAddClassroom={handleAddClassroom}
                  onEditClassroom={handleEditClassroom}
                  onRemoveClassroom={handleRemoveClassroom}
                />
              )}

              {activeTab === 'users' && (
                <UserManager
                  users={users}
                  currentUserRole={currentUserRole}
                  onAddUser={handleAddUser}
                  onEditUser={handleEditUser}
                  onToggleUserActive={handleToggleUserActive}
                />
              )}

              {activeTab === 'documentation' && (
                <DocumentationView />
              )}

            </motion.div>
          </AnimatePresence>

        </main>

        <ChatbotAsistente roleId={CHATBOT_ROLE_MAP[currentUserRole]} userName={currentUser?.name} />

        <UserProfileModal
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          currentUser={currentUser}
          onLogout={handleLogout}
        />

        <PromocionManager
          isOpen={promocionModal.isOpen}
          periodoId={promocionModal.periodoId}
          periodoNombre={promocionModal.periodoNombre}
          onClose={handleClosePromocion}
          onComplete={() => {
            fetchPeriods();
          }}
          onRefreshPeriods={fetchPeriods}
        />

      </div>
    </div>
  );
}
