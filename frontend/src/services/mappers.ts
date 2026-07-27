import { User, UserRole, Student, Classroom, Subject, EvaluationPlan, ScheduleEvent, Grade, StudyPlanItem, SchoolPeriod, Section, Representative, AcademicYear, Docente, MomentoType } from '../types';

export function mapRole(idRol: number): UserRole {
  if (idRol === 4) return 'super_admin';
  if (idRol === 5) return 'docente';
  if (idRol === 7) return 'coordinador';
  if (idRol === 8) return 'control_estudios';
  return 'docente';
}

export function mapUsuarioToUser(dbUser: any): User {
  return {
    id: String(dbUser.id || dbUser.id_usuario),
    name: dbUser.nombre1
      ? `${dbUser.nombre1} ${dbUser.apellido1 || ''}`.trim()
      : (dbUser.username || `Usuario ${dbUser.id}`),
    email: dbUser.correo || `${dbUser.username}@local.liceo`,
    role: mapRole(dbUser.idRol || dbUser.id_rol),
    active: dbUser.estatus === 'Activo',
    cedula: dbUser.cedula || undefined,
    phone: dbUser.telefono || undefined,
    username: dbUser.username || undefined,
    teacherId: dbUser.id ? String(dbUser.id) : undefined,
    firstName: dbUser.nombre1 || undefined,
    secondName: dbUser.nombre2 || undefined,
    lastName: dbUser.apellido1 || undefined,
    secondLastName: dbUser.apellido2 || undefined,
    dateOfBirth: dbUser.fechaNac || dbUser.fecha_nac || undefined,
    id_especialidad: dbUser.idEspecialidad || undefined,
  };
}

export function mapDocenteToDocenteType(dbDocente: any): Docente {
  return {
    id: String(dbDocente.id || dbDocente.id_usuario || dbDocente.id_docente || dbDocente.idDocente || dbDocente.id),
    cedula: dbDocente.cedula,
    firstName: dbDocente.nombre1,
    secondName: dbDocente.nombre2 || undefined,
    lastName: dbDocente.apellido1,
    secondLastName: dbDocente.apellido2 || undefined,
    id_especialidad: dbDocente.id_especialidad || dbDocente.idEspecialidad || undefined,
    dateOfBirth: dbDocente.fecha_nac || dbDocente.fechaNac || undefined,
    phone: dbDocente.telefono || undefined,
    email: dbDocente.correo || undefined,
    status: dbDocente.estatus_docente || dbDocente.estatus || 'Activo',
  };
}

export function mapPeriodoToSchoolPeriod(dbPeriodo: any): SchoolPeriod {
  return {
    id: String(dbPeriodo.id_periodo),
    name: dbPeriodo.nombre,
    status: dbPeriodo.estatus as any,
    fecha_inicio: dbPeriodo.fecha_inicio || null,
    fecha_fin: dbPeriodo.fecha_fin || null,
    momentos: dbPeriodo.momentos ? dbPeriodo.momentos.map(mapMomentoToMomentoType) : [],
  };
}

export function mapMomentoToMomentoType(dbMomento: any): MomentoType {
  return {
    id_momento: dbMomento.id_momento,
    id_periodo: dbMomento.id_periodo,
    descripcion: dbMomento.descripcion,
    estatus: dbMomento.estatus || 'Abierto',
  };
}

export function mapEstudianteToStudent(dbStudent: any, matriculas?: any[], secciones?: any[], activePeriodId?: number): Student {
  let academicYear: number = 1;
  let section: string = 'A';

  if (matriculas && secciones) {
    let studentMatriculas = matriculas.filter((m: any) => m.id_estudiante === dbStudent.id_estudiante);
    if (activePeriodId) {
      studentMatriculas = studentMatriculas.filter((m: any) => m.id_periodo === activePeriodId);
    }
    const activeMatricula = studentMatriculas.find((m: any) => m.estatus_matricula === 'Activo') || studentMatriculas[0];
    if (activeMatricula) {
      const seccion = secciones.find((s: any) => String(s.id_seccion || s.id) === String(activeMatricula.id_seccion));
      if (seccion) {
        academicYear = seccion.grado?.numero || seccion.id_grado || seccion.grade || 1;
        section = seccion.letra || seccion.letter || 'A';
      }
    }
  }

  const repP = dbStudent.representante;

  return {
    id: String(dbStudent.id_estudiante),
    firstName: dbStudent.nombre1 + (dbStudent.nombre2 ? ` ${dbStudent.nombre2}` : ''),
    lastName: dbStudent.apellido1 + (dbStudent.apellido2 ? ` ${dbStudent.apellido2}` : ''),
    cedula: dbStudent.cedula_escolar,
    academicYear: academicYear as AcademicYear,
    section,
    status: dbStudent.estatus_estudiante === 'Inactivo' ? 'Inactivo' : 
            dbStudent.estatus_estudiante === 'Retirado' ? 'Retirado' : 'Activo',
    representativeName: repP 
      ? `${repP.nombre1} ${repP.apellido1}` 
      : 'No asignado',
    representativeCedula: repP?.cedula_rep || '',
    representativePhone: repP?.telefono || '',
    dateOfBirth: dbStudent.fecha_nac,
    gender: dbStudent.genero || 'M',
    birthPlace: dbStudent.lugar_nac || undefined,
    municipality: dbStudent.municipio || undefined,
    state: dbStudent.estado || undefined,
    representativeEmail: repP?.correo || undefined,
    representativeAddress: repP?.direccion || undefined,
    repFirstName: repP?.nombre1 || undefined,
    repSecondName: repP?.nombre2 || undefined,
    repLastName: repP?.apellido1 || undefined,
    repSecondLastName: repP?.apellido2 || undefined,
  };
}

export function mapAulaToClassroom(dbAula: any): Classroom {
  return {
    id: String(dbAula.id_aula),
    name: dbAula.nombre_codigo,
    capacity: dbAula.capacidad || 30,
    type: dbAula.tipo_espacio as any,
    location: dbAula.ubicacion || ''
  };
}

export function mapAsignaturaToSubject(dbAsignatura: any, studyPlans?: any[]): Subject {
  let years: AcademicYear[] = [1, 2, 3, 4, 5];

  if (studyPlans) {
    const subjectPlans = studyPlans.filter((p: any) => String(p.id_asignatura) === String(dbAsignatura.id_asignatura));
    const uniqueYears = [...new Set(subjectPlans.map((p: any) => Number(p.grado?.numero || p.id_grado)).filter(Boolean))] as AcademicYear[];
    years = uniqueYears.sort((a, b) => a - b);
  }

  return {
    id: String(dbAsignatura.id_asignatura),
    name: dbAsignatura.nombre,
    shortName: dbAsignatura.nombre.substring(0, 3).toUpperCase(),
    years,
    tipoCalificacion: dbAsignatura.tipo_calificacion || 'Cuantitativa'
  };
}

export function mapHorarioToScheduleEvent(dbHorario: any): ScheduleEvent {
  const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
  const dayName = dbHorario.dia?.nombre || days[(dbHorario.id_dia - 1) % 5] || 'Lunes';
  const timeBlock = dbHorario.bloque ? `${dbHorario.bloque.hora_inicio.substring(0, 5)} - ${dbHorario.bloque.hora_fin.substring(0, 5)}` : '00:00 - 00:00';
  
  return {
    id: String(dbHorario.id_horario),
    day: dayName as any,
    timeBlock: timeBlock,
    year: dbHorario.seccion?.grado?.numero || dbHorario.id_grado || 1,
    section: dbHorario.seccion?.letra || 'A',
    subjectId: String(dbHorario.id_asignatura),
    teacherId: String(dbHorario.id_docente),
    classroomId: String(dbHorario.id_aula),
    blockId: String(dbHorario.id_bloque || dbHorario.bloque?.id_bloque || ''),
  };
}

export function mapPlanToEvaluationPlan(dbPlan: any): EvaluationPlan {
  return {
    subjectId: String(dbPlan.id_asignatura),
    year: dbPlan.grado?.numero || 1,
    section: 'A', // TODO: Backend plan does not have section
    lapso: 1, // Will be generated per lapso in UI if needed
    evaluations: [
      { id: `ev1-${dbPlan.id_plan}`, name: 'Evaluación Única', percentage: 100 }
    ]
  };
}

export function mapPlanToStudyPlanItem(dbPlan: any): StudyPlanItem {
  return {
    id: String(dbPlan.id_plan),
    subjectId: String(dbPlan.id_asignatura),
    subjectName: dbPlan.asignatura?.nombre || `Materia #${dbPlan.id_asignatura}`,
    year: (dbPlan.grado?.numero || dbPlan.id_grado || 1) as any,
    codigo: dbPlan.codigo_asignatura || '',
    posicion: dbPlan.posicion || 0,
    tipoCalificacion: dbPlan.asignatura?.tipo_calificacion || 'Cuantitativa',
    id_tipo_plan: dbPlan.id_tipo_plan || 1, // Fallback to 1 if not present
  };
}

export function mapCalificacionToGrade(dbCalificacion: any, studentId: string): Grade {
  let lapso = 1 as 1|2|3;
  const momentoDesc = dbCalificacion.momento?.descripcion;
  if (momentoDesc) {
    if (momentoDesc === 'Primer Lapso' || momentoDesc === 'Lapso 1') lapso = 1;
    else if (momentoDesc === 'Segundo Lapso' || momentoDesc === 'Lapso 2') lapso = 2;
    else if (momentoDesc === 'Tercer Lapso' || momentoDesc === 'Lapso 3') lapso = 3;
  } else {
    const rawId = dbCalificacion.id_momento || 1;
    if (rawId >= 1 && rawId <= 3) lapso = rawId as 1|2|3;
  }

  return {
    studentId: String(dbCalificacion.matricula?.id_estudiante || studentId),
    subjectId: String(dbCalificacion.plan?.id_asignatura || dbCalificacion.id_asignatura),
    lapso: lapso,
    evaluationId: `ev1-${dbCalificacion.id_plan}`,
    score: dbCalificacion.escala?.nota_calculo ?? dbCalificacion.id_escala ?? 0,
    periodId: dbCalificacion.momento?.id_periodo || undefined,
  };
}

export function mapEvaluacionesDbToPlans(evaluacionesDb: any[], studyPlans: any[], sectionsMap: any): EvaluationPlan[] {
  // Agrupar evaluaciones por plan-seccion-momento
  const map = new Map<string, EvaluationPlan>();
  
  for (const ev of evaluacionesDb) {
    const planObj = studyPlans.find(p => String(p.id_plan || p.id) === String(ev.id_plan));
    if (!planObj) continue;
    
    const subjectId = String(planObj.id_asignatura || planObj.subjectId);
    const year = Number(planObj.year || planObj.grado?.numero || 1) as any;
    const sectionObj = sectionsMap[ev.id_seccion];
    const section = sectionObj ? sectionObj.letra : 'A';
    let lapso = ev.id_momento as 1|2|3;
    if (ev.momento) {
      const desc = ev.momento.descripcion;
      if (desc === 'Primer Lapso' || desc === 'Lapso 1') lapso = 1;
      else if (desc === 'Segundo Lapso' || desc === 'Lapso 2') lapso = 2;
      else if (desc === 'Tercer Lapso' || desc === 'Lapso 3') lapso = 3;
    }
    
    const key = `${subjectId}-${year}-${section}-${lapso}`;
    
    if (!map.has(key)) {
      map.set(key, { subjectId, year, section, lapso, evaluations: [] });
    }
    
    map.get(key)!.evaluations.push({
      id: String(ev.id_evaluacion),
      name: ev.descripcion,
      percentage: ev.ponderacion
    });
  }
  
  return Array.from(map.values());
}

export function mapSeccionToSection(dbSeccion: any): Section {
  return {
    id: String(dbSeccion.id_seccion),
    grade: dbSeccion.grado?.numero || dbSeccion.id_grado || 1,
    letter: dbSeccion.letra,
    periodId: String(dbSeccion.periodo?.id_periodo || dbSeccion.id_periodo),
    teacherGuideId: String(dbSeccion.docenteGuia?.id_usuario || dbSeccion.docenteGuia?.id || dbSeccion.id_docente_guia),
    homeClassroomId: String(dbSeccion.aula?.id_aula || dbSeccion.id_aula || ''),
    capacityMax: dbSeccion.capacidad_maxima || undefined,
  };
}

export function mapRepresentanteToRepresentative(dbRep: any): Representative {
  return {
    id: String(dbRep.id_representante),
    cedula: dbRep.cedula_rep,
    firstName: dbRep.nombre1 + (dbRep.nombre2 ? ` ${dbRep.nombre2}` : ''),
    lastName: dbRep.apellido1 + (dbRep.apellido2 ? ` ${dbRep.apellido2}` : ''),
    phone: dbRep.telefono || '',
  };
}

export function mapNotaParcialToGrade(dbNota: any, studentId: string): Grade {
  let lapso = 1 as 1|2|3;
  const momentoDesc = dbNota.evaluacion?.momento?.descripcion || dbNota.momento?.descripcion;
  if (momentoDesc) {
    if (momentoDesc === 'Primer Lapso' || momentoDesc === 'Lapso 1') lapso = 1;
    else if (momentoDesc === 'Segundo Lapso' || momentoDesc === 'Lapso 2') lapso = 2;
    else if (momentoDesc === 'Tercer Lapso' || momentoDesc === 'Lapso 3') lapso = 3;
  } else {
    const rawId = dbNota.evaluacion?.id_momento || dbNota.id_momento || 1;
    if (rawId >= 1 && rawId <= 3) lapso = rawId as 1|2|3;
  }

  const resolvedStudentId = dbNota.matricula?.id_estudiante
    ? String(dbNota.matricula.id_estudiante)
    : studentId;

  const resolvedSubjectId = dbNota.evaluacion?.plan?.id_asignatura
    ? String(dbNota.evaluacion.plan.id_asignatura)
    : '';

  return {
    studentId: resolvedStudentId,
    subjectId: resolvedSubjectId,
    lapso: lapso,
    evaluationId: String(dbNota.id_evaluacion),
    score: dbNota.escala?.nota_calculo ?? dbNota.id_escala ?? 0,
    periodId: dbNota.evaluacion?.momento?.id_periodo || undefined,
  };
}
