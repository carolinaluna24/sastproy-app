import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    // =========================================
    // 1. PROGRAMAS Y MODALIDADES
    // =========================================
    const { data: programs } = await supabase.from("programs").upsert([
      { name: "Ingeniería Informática" },
      { name: "Ingeniería Mecánica" },
      { name: "Ingeniería Civil" },
    ], { onConflict: "name" }).select();

    const { data: modalities } = await supabase.from("modalities").upsert([
      { name: "TRABAJO_GRADO" },
      { name: "PASANTIA" },
      { name: "CIP" },
      { name: "PASANTIA_EMPRESARIAL" },
      { name: "POSGRADO_CREDITOS" },
      { name: "GRUPO_INVESTIGACION" },
    ], { onConflict: "name" }).select();

    const progInfo = programs!.find((p: any) => p.name === "Ingeniería Informática")!;
    const progMec = programs!.find((p: any) => p.name === "Ingeniería Mecánica")!;
    const progCiv = programs!.find((p: any) => p.name === "Ingeniería Civil")!;
    const modTG = modalities!.find((m: any) => m.name === "TRABAJO_GRADO")!;
    const modPas = modalities!.find((m: any) => m.name === "PASANTIA")!;

    for (const mod of modalities!) {
      const isImplemented = mod.name === "TRABAJO_GRADO";
      const descriptions: Record<string, string> = {
        TRABAJO_GRADO: "Trabajo de Grado: flujo completo implementado.",
        CIP: "Curso de Investigación Profesional: pendiente de implementación.",
        PASANTIA: "Pasantía académica: pendiente de implementación.",
        PASANTIA_EMPRESARIAL: "Pasantía Empresarial: pendiente de implementación.",
        POSGRADO_CREDITOS: "Posgrado por Créditos: pendiente de implementación.",
        GRUPO_INVESTIGACION: "Grupo de Investigación: pendiente de implementación.",
      };
      await supabase.from("modality_configs").upsert({
        modality_id: mod.id, enabled: true, implemented: isImplemented,
        description: descriptions[mod.name] || "Modalidad pendiente.",
      }, { onConflict: "modality_id" });
    }

    // =========================================
    // 2. USUARIOS
    // =========================================
    const userDefs = [
      { email: "student1@test.com", name: "Ana García", role: "STUDENT", programId: progInfo.id },
      { email: "student2@test.com", name: "Carlos López", role: "STUDENT", programId: progInfo.id },
      { email: "student3@test.com", name: "María Jiménez", role: "STUDENT", programId: progMec.id },
      { email: "student4@test.com", name: "Luis Ramírez", role: "STUDENT", programId: progMec.id },
      { email: "student5@test.com", name: "Sofía Torres", role: "STUDENT", programId: progCiv.id },
      { email: "student6@test.com", name: "Diego Morales", role: "STUDENT", programId: progCiv.id },
      { email: "asesor@test.com", name: "Pedro Martínez", role: "ASESOR", programId: null },
      { email: "asesor2@test.com", name: "Carmen Ruiz", role: "ASESOR", programId: null },
      { email: "juror1@test.com", name: "Laura Sánchez", role: "JUROR", programId: null },
      { email: "juror2@test.com", name: "José Hernández", role: "JUROR", programId: null },
      { email: "juror3@test.com", name: "Elena Castro", role: "JUROR", programId: null },
      { email: "coordinator@test.com", name: "María Rodríguez", role: "COORDINATOR", programId: null },
      { email: "decano@test.com", name: "Roberto Vargas", role: "DECANO", programId: null },
    ];

    const userIds: Record<string, string> = {};

    for (const u of userDefs) {
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existing = existingUsers?.users?.find((eu: any) => eu.email === u.email);
      let userId: string;
      if (existing) {
        userId = existing.id;
      } else {
        const { data, error } = await supabase.auth.admin.createUser({
          email: u.email, password: "Test1234!", email_confirm: true,
          user_metadata: { full_name: u.name },
        });
        if (error) throw new Error(`Error creando ${u.email}: ${error.message}`);
        userId = data.user.id;
      }
      const updateData: any = { full_name: u.name };
      if (u.programId) updateData.program_id = u.programId;
      await supabase.from("user_profiles").update(updateData).eq("id", userId);
      await supabase.from("user_roles").upsert({ user_id: userId, role: u.role }, { onConflict: "user_id,role" });
      userIds[u.email] = userId;
    }

    const coord = userIds["coordinator@test.com"];
    const dir1 = userIds["asesor@test.com"];
    const dir2 = userIds["asesor2@test.com"];
    const j1 = userIds["juror1@test.com"];
    const j2 = userIds["juror2@test.com"];
    const j3 = userIds["juror3@test.com"];
    const s1 = userIds["student1@test.com"];
    const s2 = userIds["student2@test.com"];
    const s3 = userIds["student3@test.com"];
    const s4 = userIds["student4@test.com"];
    const s5 = userIds["student5@test.com"];
    const s6 = userIds["student6@test.com"];

    // =========================================
    // Helper: crear proyecto completo con submissions, evaluaciones y avales
    // =========================================
    async function createProject(opts: {
      title: string; description: string; programId: string; modalityId: string;
      createdBy: string; directorId: string; authors: string[];
      globalStatus: string;
      stages: { stageName: string; systemState: string; officialState: string; finalGrade?: number; observations?: string; }[];
      jurors?: string[];
      deadlines?: { stageIndex: number; description: string; dueDaysFromNow: number }[];
      auditEvents?: { eventType: string; description: string }[];
      // NEW: submissions per stage
      submissions?: { stageIndex: number; submittedBy: string; url: string; notes?: string }[];
      // NEW: evaluations per submission
      evaluations?: { stageIndex: number; evaluatorId: string; result: string; observations: string }[];
      // NEW: endorsements per submission
      endorsements?: { stageIndex: number; endorsedBy: string; approved: boolean; comments?: string }[];
    }) {
      const { data: proj, error: projErr } = await supabase.from("projects").insert({
        title: opts.title, description: opts.description,
        program_id: opts.programId, modality_id: opts.modalityId,
        created_by: opts.createdBy, asesor_id: opts.directorId,
        global_status: opts.globalStatus as any,
      }).select().single();
      if (projErr) throw new Error(`Error proyecto "${opts.title}": ${projErr.message}`);

      for (const authorId of opts.authors) {
        await supabase.from("project_members").insert({ project_id: proj.id, user_id: authorId, role: "AUTHOR" as any });
      }
      await supabase.from("project_members").insert({ project_id: proj.id, user_id: opts.directorId, role: "DIRECTOR" as any });

      const createdStages: any[] = [];
      for (const stage of opts.stages) {
        const { data: stg } = await supabase.from("project_stages").insert({
          project_id: proj.id, stage_name: stage.stageName as any,
          system_state: stage.systemState as any, official_state: stage.officialState as any,
          final_grade: stage.finalGrade ?? null, observations: stage.observations ?? null,
        }).select().single();
        createdStages.push(stg);
      }

      // Submissions
      const createdSubmissions: Record<number, any> = {};
      if (opts.submissions) {
        for (const sub of opts.submissions) {
          const targetStage = createdStages[sub.stageIndex];
          if (!targetStage) continue;
          const { data: subData } = await supabase.from("submissions").insert({
            project_stage_id: targetStage.id, submitted_by: sub.submittedBy,
            version: 1, external_url: sub.url, notes: sub.notes || null,
          }).select().single();
          if (!createdSubmissions[sub.stageIndex]) createdSubmissions[sub.stageIndex] = subData;
        }
      }

      // Evaluations
      if (opts.evaluations) {
        for (const ev of opts.evaluations) {
          const sub = createdSubmissions[ev.stageIndex];
          const targetStage = createdStages[ev.stageIndex];
          if (!sub || !targetStage) continue;
          await supabase.from("evaluations").insert({
            submission_id: sub.id, evaluator_id: ev.evaluatorId,
            project_stage_id: targetStage.id,
            official_result: ev.result, observations: ev.observations,
          });
        }
      }

      // Endorsements
      if (opts.endorsements) {
        for (const end of opts.endorsements) {
          const sub = createdSubmissions[end.stageIndex];
          if (!sub) continue;
          await supabase.from("endorsements").insert({
            submission_id: sub.id, endorsed_by: end.endorsedBy,
            approved: end.approved, comments: end.comments || null,
          });
        }
      }

      // Jurors assignments
      if (opts.jurors && createdStages.length > 0) {
        const lastStage = createdStages[createdStages.length - 1];
        for (const jurorId of opts.jurors) {
          await supabase.from("assignments").insert({
            project_id: proj.id, user_id: jurorId, assigned_by: coord,
            stage_name: lastStage.stage_name,
            due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
          });
        }
      }

      if (opts.deadlines) {
        for (const dl of opts.deadlines) {
          const targetStage = createdStages[dl.stageIndex];
          if (targetStage) {
            await supabase.from("deadlines").insert({
              project_stage_id: targetStage.id, description: dl.description,
              due_date: new Date(Date.now() + dl.dueDaysFromNow * 24 * 60 * 60 * 1000).toISOString(),
              created_by: coord,
            });
          }
        }
      }

      if (opts.auditEvents) {
        for (const evt of opts.auditEvents) {
          await supabase.from("audit_events").insert({
            project_id: proj.id, user_id: coord,
            event_type: evt.eventType, description: evt.description,
          });
        }
      }

      return { project: proj, stages: createdStages };
    }

    // =========================================
    // 3. CREAR 10 PROYECTOS CON DATOS COMPLETOS
    // =========================================

    // P1: Propuesta radicada pendiente de evaluación (coordinator evalúa)
    await createProject({
      title: "Sistema de Gestión de Inventarios con IoT",
      description: "Implementación de sensores IoT para gestión automática de inventarios en bodegas.",
      programId: progInfo.id, modalityId: modTG.id,
      createdBy: s1, directorId: dir1, authors: [s1, s2],
      globalStatus: "VIGENTE",
      stages: [{ stageName: "PROPUESTA", systemState: "RADICADA", officialState: "PENDIENTE" }],
      submissions: [{ stageIndex: 0, submittedBy: s1, url: "https://docs.google.com/document/d/propuesta-iot-inventarios", notes: "Documento completo de propuesta" }],
      auditEvents: [
        { eventType: "PROJECT_CREATED", description: "Proyecto creado por Ana García" },
        { eventType: "PROPOSAL_SUBMITTED", description: "Propuesta radicada" },
      ],
    });

    // P2: Propuesta evaluada - aprobada con modificaciones + deadline
    await createProject({
      title: "App Móvil de Transporte Universitario",
      description: "Aplicación para coordinar rutas de transporte dentro del campus.",
      programId: progInfo.id, modalityId: modTG.id,
      createdBy: s3, directorId: dir1, authors: [s3],
      globalStatus: "VIGENTE",
      stages: [{ stageName: "PROPUESTA", systemState: "CERRADA", officialState: "APROBADA_CON_MODIFICACIONES", observations: "Ampliar marco teórico y definir alcance tecnológico" }],
      submissions: [{ stageIndex: 0, submittedBy: s3, url: "https://docs.google.com/document/d/propuesta-transporte", notes: "Primera versión" }],
      deadlines: [{ stageIndex: 0, description: "Correcciones propuesta", dueDaysFromNow: 2 }],
      auditEvents: [
        { eventType: "PROJECT_CREATED", description: "Proyecto creado" },
        { eventType: "PROPOSAL_SUBMITTED", description: "Propuesta radicada" },
        { eventType: "PROPOSAL_EVALUATED", description: "Propuesta evaluada: aprobada con modificaciones" },
      ],
    });

    // P3: Anteproyecto en revisión con jurados, submissions y evaluaciones parciales
    await createProject({
      title: "Diseño de Puente Peatonal con Materiales Reciclados",
      description: "Análisis estructural de puente usando plástico reciclado.",
      programId: progCiv.id, modalityId: modTG.id,
      createdBy: s5, directorId: dir2, authors: [s5, s6],
      globalStatus: "VIGENTE",
      stages: [
        { stageName: "PROPUESTA", systemState: "CERRADA", officialState: "APROBADA" },
        { stageName: "ANTEPROYECTO", systemState: "EN_REVISION", officialState: "PENDIENTE" },
      ],
      submissions: [
        { stageIndex: 0, submittedBy: s5, url: "https://docs.google.com/document/d/propuesta-puente" },
        { stageIndex: 1, submittedBy: s5, url: "https://docs.google.com/document/d/anteproyecto-puente", notes: "Anteproyecto completo con análisis FEM" },
      ],
      endorsements: [{ stageIndex: 1, endorsedBy: dir2, approved: true, comments: "El documento cumple con los requisitos para revisión" }],
      evaluations: [
        { stageIndex: 1, evaluatorId: j1, result: "APROBADO", observations: "Buen planteamiento metodológico. Revisar cálculos de resistencia." },
      ],
      jurors: [j1, j2],
      deadlines: [{ stageIndex: 1, description: "Plazo evaluación anteproyecto", dueDaysFromNow: 5 }],
      auditEvents: [
        { eventType: "PROJECT_CREATED", description: "Proyecto creado" },
        { eventType: "PROPOSAL_EVALUATED", description: "Propuesta aprobada" },
        { eventType: "ANTEPROJECT_SUBMITTED", description: "Anteproyecto radicado" },
        { eventType: "ANTEPROJECT_ENDORSED", description: "Aval del director otorgado" },
        { eventType: "JURORS_ASSIGNED", description: "2 jurados asignados" },
      ],
    });

    // P4: Anteproyecto aprobado, informe final en borrador (estudiante debe subir documento)
    await createProject({
      title: "Análisis de Vibraciones en Turbinas Eólicas",
      description: "Estudio de fatiga y vibraciones en turbinas de baja potencia.",
      programId: progMec.id, modalityId: modTG.id,
      createdBy: s3, directorId: dir2, authors: [s3, s4],
      globalStatus: "VIGENTE",
      stages: [
        { stageName: "PROPUESTA", systemState: "CERRADA", officialState: "APROBADA" },
        { stageName: "ANTEPROYECTO", systemState: "CERRADA", officialState: "APROBADA" },
        { stageName: "INFORME_FINAL", systemState: "BORRADOR", officialState: "PENDIENTE" },
      ],
      submissions: [
        { stageIndex: 0, submittedBy: s3, url: "https://docs.google.com/document/d/propuesta-turbinas" },
        { stageIndex: 1, submittedBy: s3, url: "https://docs.google.com/document/d/anteproyecto-turbinas", notes: "Incluye simulaciones CFD" },
      ],
      endorsements: [{ stageIndex: 1, endorsedBy: dir2, approved: true, comments: "Excelente trabajo de simulación" }],
      evaluations: [
        { stageIndex: 1, evaluatorId: j2, result: "APROBADO", observations: "Metodología sólida y resultados consistentes" },
        { stageIndex: 1, evaluatorId: j3, result: "APROBADO", observations: "Recomiendo incluir análisis de sensibilidad" },
      ],
      jurors: [j2, j3],
      auditEvents: [
        { eventType: "PROJECT_CREATED", description: "Proyecto creado" },
        { eventType: "PROPOSAL_EVALUATED", description: "Propuesta aprobada" },
        { eventType: "ANTEPROJECT_CONSOLIDATED", description: "Anteproyecto aprobado" },
        { eventType: "STAGE_CREATED", description: "Etapa Informe Final habilitada" },
      ],
    });

    // P5: Informe final en evaluación con jurados asignados
    await createProject({
      title: "Plataforma Web de Aprendizaje Adaptativo",
      description: "Sistema web que adapta contenido pedagógico según el desempeño del estudiante.",
      programId: progInfo.id, modalityId: modTG.id,
      createdBy: s5, directorId: dir1, authors: [s5],
      globalStatus: "VIGENTE",
      stages: [
        { stageName: "PROPUESTA", systemState: "CERRADA", officialState: "APROBADA" },
        { stageName: "ANTEPROYECTO", systemState: "CERRADA", officialState: "APROBADA" },
        { stageName: "INFORME_FINAL", systemState: "EN_REVISION", officialState: "PENDIENTE" },
      ],
      submissions: [
        { stageIndex: 0, submittedBy: s5, url: "https://docs.google.com/document/d/propuesta-elearning" },
        { stageIndex: 1, submittedBy: s5, url: "https://docs.google.com/document/d/anteproyecto-elearning" },
        { stageIndex: 2, submittedBy: s5, url: "https://docs.google.com/document/d/informe-elearning", notes: "Informe final con pruebas de usuario" },
      ],
      endorsements: [
        { stageIndex: 1, endorsedBy: dir1, approved: true },
        { stageIndex: 2, endorsedBy: dir1, approved: true, comments: "Documento listo para revisión de jurados" },
      ],
      evaluations: [
        { stageIndex: 2, evaluatorId: j1, result: "APROBADO", observations: "Excelente implementación del algoritmo adaptativo" },
      ],
      jurors: [j1, j3],
      deadlines: [{ stageIndex: 2, description: "Plazo evaluación informe final", dueDaysFromNow: 1 }],
      auditEvents: [
        { eventType: "PROJECT_CREATED", description: "Proyecto creado" },
        { eventType: "INFORME_SUBMITTED", description: "Informe final radicado" },
        { eventType: "INFORME_ENDORSED", description: "Aval del director" },
        { eventType: "JURORS_ASSIGNED", description: "Jurados asignados" },
      ],
    });

    // P6: Sustentación pendiente de programar
    await createProject({
      title: "Optimización de Rutas Logísticas con Algoritmos Genéticos",
      description: "Aplicación de metaheurísticas para optimizar distribución de mercancía.",
      programId: progInfo.id, modalityId: modPas.id,
      createdBy: s6, directorId: dir2, authors: [s6],
      globalStatus: "VIGENTE",
      stages: [
        { stageName: "PROPUESTA", systemState: "CERRADA", officialState: "APROBADA" },
        { stageName: "ANTEPROYECTO", systemState: "CERRADA", officialState: "APROBADA" },
        { stageName: "INFORME_FINAL", systemState: "CERRADA", officialState: "APROBADA" },
        { stageName: "SUSTENTACION", systemState: "BORRADOR", officialState: "PENDIENTE" },
      ],
      submissions: [
        { stageIndex: 0, submittedBy: s6, url: "https://docs.google.com/document/d/propuesta-logistica" },
        { stageIndex: 1, submittedBy: s6, url: "https://docs.google.com/document/d/anteproyecto-logistica" },
        { stageIndex: 2, submittedBy: s6, url: "https://docs.google.com/document/d/informe-logistica", notes: "Incluye resultados experimentales completos" },
      ],
      endorsements: [
        { stageIndex: 1, endorsedBy: dir2, approved: true },
        { stageIndex: 2, endorsedBy: dir2, approved: true, comments: "Resultados sobresalientes" },
      ],
      evaluations: [
        { stageIndex: 1, evaluatorId: j1, result: "APROBADO", observations: "Bien estructurado" },
        { stageIndex: 1, evaluatorId: j2, result: "APROBADO", observations: "Correcta aplicación de AG" },
        { stageIndex: 2, evaluatorId: j1, result: "APROBADO", observations: "Resultados significativos" },
        { stageIndex: 2, evaluatorId: j2, result: "APROBADO", observations: "Excelente trabajo" },
      ],
      deadlines: [{ stageIndex: 3, description: "Programar sustentación", dueDaysFromNow: 3 }],
      auditEvents: [
        { eventType: "PROJECT_CREATED", description: "Proyecto creado" },
        { eventType: "INFORME_CONSOLIDATED", description: "Informe final aprobado" },
        { eventType: "STAGE_CREATED", description: "Etapa Sustentación habilitada" },
      ],
    });

    // P7: Sustentación meritoria - FINALIZADO
    await createProject({
      title: "Robot Explorador para Terrenos Irregulares",
      description: "Diseño y construcción de robot con tracción adaptativa.",
      programId: progMec.id, modalityId: modTG.id,
      createdBy: s1, directorId: dir1, authors: [s1],
      globalStatus: "FINALIZADO",
      stages: [
        { stageName: "PROPUESTA", systemState: "CERRADA", officialState: "APROBADA" },
        { stageName: "ANTEPROYECTO", systemState: "CERRADA", officialState: "APROBADA" },
        { stageName: "INFORME_FINAL", systemState: "CERRADA", officialState: "APROBADA" },
        { stageName: "SUSTENTACION", systemState: "CERRADA", officialState: "APROBADA", finalGrade: 97 },
      ],
      submissions: [
        { stageIndex: 0, submittedBy: s1, url: "https://docs.google.com/document/d/propuesta-robot" },
        { stageIndex: 1, submittedBy: s1, url: "https://docs.google.com/document/d/anteproyecto-robot" },
        { stageIndex: 2, submittedBy: s1, url: "https://docs.google.com/document/d/informe-robot" },
      ],
      endorsements: [
        { stageIndex: 1, endorsedBy: dir1, approved: true, comments: "Trabajo innovador" },
        { stageIndex: 2, endorsedBy: dir1, approved: true, comments: "Listo para sustentación" },
      ],
      evaluations: [
        { stageIndex: 1, evaluatorId: j1, result: "APROBADO", observations: "Diseño mecánico innovador" },
        { stageIndex: 1, evaluatorId: j2, result: "APROBADO", observations: "Buen análisis cinemático" },
        { stageIndex: 2, evaluatorId: j1, result: "APROBADO", observations: "Pruebas de campo excelentes" },
        { stageIndex: 2, evaluatorId: j2, result: "APROBADO", observations: "Resultados destacados" },
      ],
      auditEvents: [
        { eventType: "PROJECT_CREATED", description: "Proyecto creado" },
        { eventType: "DEFENSE_RECORDED", description: "Sustentación registrada: MERITORIA (97/100)" },
        { eventType: "FINAL_DELIVERY", description: "Entrega final post-sustentación recibida" },
        { eventType: "PROJECT_CLOSED", description: "Proyecto finalizado" },
      ],
    });

    // P8: Sustentación reprobada
    await createProject({
      title: "Sistema de Monitoreo de Calidad del Aire",
      description: "Red de sensores para medir contaminantes en tiempo real.",
      programId: progCiv.id, modalityId: modTG.id,
      createdBy: s2, directorId: dir2, authors: [s2],
      globalStatus: "VIGENTE",
      stages: [
        { stageName: "PROPUESTA", systemState: "CERRADA", officialState: "APROBADA" },
        { stageName: "ANTEPROYECTO", systemState: "CERRADA", officialState: "APROBADA" },
        { stageName: "INFORME_FINAL", systemState: "CERRADA", officialState: "APROBADA" },
        { stageName: "SUSTENTACION", systemState: "CERRADA", officialState: "NO_APROBADA", finalGrade: 55 },
      ],
      submissions: [
        { stageIndex: 0, submittedBy: s2, url: "https://docs.google.com/document/d/propuesta-aire" },
        { stageIndex: 1, submittedBy: s2, url: "https://docs.google.com/document/d/anteproyecto-aire" },
        { stageIndex: 2, submittedBy: s2, url: "https://docs.google.com/document/d/informe-aire" },
      ],
      endorsements: [
        { stageIndex: 1, endorsedBy: dir2, approved: true },
        { stageIndex: 2, endorsedBy: dir2, approved: true },
      ],
      evaluations: [
        { stageIndex: 1, evaluatorId: j3, result: "APROBADO", observations: "Aceptable" },
        { stageIndex: 1, evaluatorId: j1, result: "APLAZADO_POR_MODIFICACIONES", observations: "Falta análisis de datos" },
        { stageIndex: 2, evaluatorId: j3, result: "APROBADO", observations: "Mejoró notablemente" },
        { stageIndex: 2, evaluatorId: j1, result: "APROBADO", observations: "Correcciones implementadas" },
      ],
      auditEvents: [
        { eventType: "PROJECT_CREATED", description: "Proyecto creado" },
        { eventType: "DEFENSE_RECORDED", description: "Sustentación registrada: REPROBADA (55/100)" },
      ],
    });

    // P9: Proyecto vencido
    await createProject({
      title: "Automatización de Procesos Industriales con PLC",
      description: "Diseño de sistema SCADA para planta de producción.",
      programId: progMec.id, modalityId: modPas.id,
      createdBy: s4, directorId: dir1, authors: [s4],
      globalStatus: "VENCIDO",
      stages: [
        { stageName: "PROPUESTA", systemState: "CERRADA", officialState: "APROBADA" },
        { stageName: "ANTEPROYECTO", systemState: "RADICADA", officialState: "PENDIENTE" },
      ],
      submissions: [
        { stageIndex: 0, submittedBy: s4, url: "https://docs.google.com/document/d/propuesta-plc" },
        { stageIndex: 1, submittedBy: s4, url: "https://docs.google.com/document/d/anteproyecto-plc" },
      ],
      deadlines: [{ stageIndex: 1, description: "Plazo anteproyecto vencido", dueDaysFromNow: -10 }],
      auditEvents: [
        { eventType: "PROJECT_CREATED", description: "Proyecto creado" },
        { eventType: "PROPOSAL_EVALUATED", description: "Propuesta aprobada" },
        { eventType: "PROJECT_EXPIRED", description: "Proyecto marcado como vencido" },
      ],
    });

    // P10: Proyecto cancelado
    await createProject({
      title: "Modelo Predictivo de Deserción Estudiantil",
      description: "Análisis de datos para predecir abandono académico.",
      programId: progInfo.id, modalityId: modTG.id,
      createdBy: s3, directorId: dir2, authors: [s3],
      globalStatus: "CANCELADO",
      stages: [{ stageName: "PROPUESTA", systemState: "CERRADA", officialState: "APROBADA" }],
      submissions: [{ stageIndex: 0, submittedBy: s3, url: "https://docs.google.com/document/d/propuesta-desercion" }],
      auditEvents: [
        { eventType: "PROJECT_CREATED", description: "Proyecto creado" },
        { eventType: "PROJECT_CANCELLED", description: "Proyecto cancelado por solicitud del estudiante" },
      ],
    });

    // =========================================
    // RUBRICS para validar flujo de evaluación
    // =========================================
    const rubricDefs = [
      { name: "Rúbrica Propuesta", stageName: "PROPUESTA", items: [
        { description: "Planteamiento del problema", maxScore: 25, weight: 1 },
        { description: "Objetivos y alcance", maxScore: 25, weight: 1 },
        { description: "Metodología propuesta", maxScore: 25, weight: 1 },
        { description: "Viabilidad y cronograma", maxScore: 25, weight: 1 },
      ]},
      { name: "Rúbrica Anteproyecto", stageName: "ANTEPROYECTO", items: [
        { description: "Marco teórico", maxScore: 20, weight: 1 },
        { description: "Diseño metodológico", maxScore: 25, weight: 1.2 },
        { description: "Resultados preliminares", maxScore: 30, weight: 1.5 },
        { description: "Redacción y presentación", maxScore: 25, weight: 1 },
      ]},
      { name: "Rúbrica Informe Final", stageName: "INFORME_FINAL", items: [
        { description: "Resultados y análisis", maxScore: 30, weight: 1.5 },
        { description: "Conclusiones", maxScore: 25, weight: 1.2 },
        { description: "Contribución al conocimiento", maxScore: 25, weight: 1.3 },
        { description: "Calidad del documento", maxScore: 20, weight: 1 },
      ]},
      { name: "Rúbrica Sustentación", stageName: "SUSTENTACION", items: [
        { description: "Dominio del tema", maxScore: 30, weight: 1.5 },
        { description: "Claridad en la presentación", maxScore: 25, weight: 1 },
        { description: "Respuesta a preguntas", maxScore: 25, weight: 1.2 },
        { description: "Material de apoyo", maxScore: 20, weight: 1 },
      ]},
    ];

    for (const rDef of rubricDefs) {
      const { data: rubric } = await supabase.from("rubrics").upsert(
        { name: rDef.name, stage_name: rDef.stageName as any },
        { onConflict: "name" }
      ).select().single();
      if (rubric) {
        for (const item of rDef.items) {
          await supabase.from("rubric_items").upsert({
            rubric_id: rubric.id, description: item.description,
            max_score: item.maxScore, weight: item.weight,
          }, { onConflict: "rubric_id,description" as any });
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: "Seed completo: 13 usuarios, 10 proyectos con submissions, evaluaciones, avales, rúbricas y deadlines",
      users: userDefs.map((u) => ({ email: u.email, role: u.role, password: "Test1234!" })),
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Seed error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
