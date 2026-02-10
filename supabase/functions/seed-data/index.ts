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
    ], { onConflict: "name" }).select();

    const progInfo = programs!.find((p: any) => p.name === "Ingeniería Informática")!;
    const progMec = programs!.find((p: any) => p.name === "Ingeniería Mecánica")!;
    const progCiv = programs!.find((p: any) => p.name === "Ingeniería Civil")!;
    const modTG = modalities!.find((m: any) => m.name === "TRABAJO_GRADO")!;
    const modPas = modalities!.find((m: any) => m.name === "PASANTIA")!;

    // =========================================
    // 2. USUARIOS (13 usuarios)
    // =========================================
    const userDefs = [
      // 6 estudiantes
      { email: "student1@test.com", name: "Ana García", role: "STUDENT", programId: progInfo.id },
      { email: "student2@test.com", name: "Carlos López", role: "STUDENT", programId: progInfo.id },
      { email: "student3@test.com", name: "María Jiménez", role: "STUDENT", programId: progMec.id },
      { email: "student4@test.com", name: "Luis Ramírez", role: "STUDENT", programId: progMec.id },
      { email: "student5@test.com", name: "Sofía Torres", role: "STUDENT", programId: progCiv.id },
      { email: "student6@test.com", name: "Diego Morales", role: "STUDENT", programId: progCiv.id },
      // 2 directores
      { email: "director@test.com", name: "Pedro Martínez", role: "DIRECTOR", programId: null },
      { email: "director2@test.com", name: "Carmen Ruiz", role: "DIRECTOR", programId: null },
      // 3 jurados
      { email: "juror1@test.com", name: "Laura Sánchez", role: "JUROR", programId: null },
      { email: "juror2@test.com", name: "José Hernández", role: "JUROR", programId: null },
      { email: "juror3@test.com", name: "Elena Castro", role: "JUROR", programId: null },
      // 1 coordinador
      { email: "coordinator@test.com", name: "María Rodríguez", role: "COORDINATOR", programId: null },
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
          email: u.email,
          password: "Test1234!",
          email_confirm: true,
          user_metadata: { full_name: u.name },
        });
        if (error) throw new Error(`Error creando ${u.email}: ${error.message}`);
        userId = data.user.id;
      }

      // Actualizar perfil
      const updateData: any = { full_name: u.name };
      if (u.programId) updateData.program_id = u.programId;
      await supabase.from("user_profiles").update(updateData).eq("id", userId);

      // Asignar rol
      await supabase.from("user_roles").upsert(
        { user_id: userId, role: u.role },
        { onConflict: "user_id,role" }
      );

      userIds[u.email] = userId;
    }

    const coord = userIds["coordinator@test.com"];
    const dir1 = userIds["director@test.com"];
    const dir2 = userIds["director2@test.com"];
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
    // Helper: crear proyecto completo
    // =========================================
    async function createProject(opts: {
      title: string;
      description: string;
      programId: string;
      modalityId: string;
      createdBy: string;
      directorId: string;
      authors: string[];
      globalStatus: string;
      stages: {
        stageName: string;
        systemState: string;
        officialState: string;
        finalGrade?: number;
        observations?: string;
      }[];
      jurors?: string[];
      deadlines?: { stageIndex: number; description: string; dueDaysFromNow: number }[];
      auditEvents?: { eventType: string; description: string }[];
    }) {
      // Crear proyecto
      const { data: proj, error: projErr } = await supabase.from("projects").insert({
        title: opts.title,
        description: opts.description,
        program_id: opts.programId,
        modality_id: opts.modalityId,
        created_by: opts.createdBy,
        director_id: opts.directorId,
        global_status: opts.globalStatus as any,
      }).select().single();
      if (projErr) throw new Error(`Error proyecto "${opts.title}": ${projErr.message}`);

      // Miembros: autores
      for (const authorId of opts.authors) {
        await supabase.from("project_members").insert({
          project_id: proj.id,
          user_id: authorId,
          role: "AUTHOR" as any,
        });
      }

      // Miembro: director
      await supabase.from("project_members").insert({
        project_id: proj.id,
        user_id: opts.directorId,
        role: "DIRECTOR" as any,
      });

      // Crear etapas
      const createdStages: any[] = [];
      for (const stage of opts.stages) {
        const { data: stg } = await supabase.from("project_stages").insert({
          project_id: proj.id,
          stage_name: stage.stageName as any,
          system_state: stage.systemState as any,
          official_state: stage.officialState as any,
          final_grade: stage.finalGrade ?? null,
          observations: stage.observations ?? null,
        }).select().single();
        createdStages.push(stg);
      }

      // Asignar jurados si se indicaron
      if (opts.jurors && createdStages.length > 0) {
        const lastStage = createdStages[createdStages.length - 1];
        for (const jurorId of opts.jurors) {
          await supabase.from("assignments").insert({
            project_id: proj.id,
            user_id: jurorId,
            assigned_by: coord,
            stage_name: lastStage.stage_name,
            due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
          });
        }
      }

      // Crear deadlines
      if (opts.deadlines) {
        for (const dl of opts.deadlines) {
          const targetStage = createdStages[dl.stageIndex];
          if (targetStage) {
            const dueDate = new Date(Date.now() + dl.dueDaysFromNow * 24 * 60 * 60 * 1000);
            await supabase.from("deadlines").insert({
              project_stage_id: targetStage.id,
              description: dl.description,
              due_date: dueDate.toISOString(),
              created_by: coord,
            });
          }
        }
      }

      // Crear audit_events
      if (opts.auditEvents) {
        for (const evt of opts.auditEvents) {
          await supabase.from("audit_events").insert({
            project_id: proj.id,
            user_id: coord,
            event_type: evt.eventType,
            description: evt.description,
          });
        }
      }

      return { project: proj, stages: createdStages };
    }

    // =========================================
    // 3. CREAR 10 PROYECTOS VARIADOS
    // =========================================

    // P1: Propuesta aprobada con modificaciones + deadline
    await createProject({
      title: "Sistema de Gestión de Inventarios con IoT",
      description: "Implementación de sensores IoT para gestión automática de inventarios en bodegas.",
      programId: progInfo.id, modalityId: modTG.id,
      createdBy: s1, directorId: dir1, authors: [s1, s2],
      globalStatus: "VIGENTE",
      stages: [
        { stageName: "PROPUESTA", systemState: "CERRADA", officialState: "APROBADA_CON_MODIFICACIONES" },
      ],
      deadlines: [{ stageIndex: 0, description: "Correcciones propuesta", dueDaysFromNow: 2 }],
      auditEvents: [
        { eventType: "PROJECT_CREATED", description: "Proyecto creado por Ana García" },
        { eventType: "PROPOSAL_SUBMITTED", description: "Propuesta radicada" },
        { eventType: "PROPOSAL_EVALUATED", description: "Propuesta evaluada: aprobada con modificaciones" },
      ],
    });

    // P2: Propuesta no aprobada
    await createProject({
      title: "App Móvil de Transporte Universitario",
      description: "Aplicación para coordinar rutas de transporte dentro del campus.",
      programId: progInfo.id, modalityId: modTG.id,
      createdBy: s3, directorId: dir1, authors: [s3],
      globalStatus: "VIGENTE",
      stages: [
        { stageName: "PROPUESTA", systemState: "CERRADA", officialState: "NO_APROBADA", observations: "No cumple con los requisitos de investigación" },
      ],
      auditEvents: [
        { eventType: "PROJECT_CREATED", description: "Proyecto creado" },
        { eventType: "PROPOSAL_SUBMITTED", description: "Propuesta radicada" },
        { eventType: "PROPOSAL_EVALUATED", description: "Propuesta no aprobada" },
      ],
    });

    // P3: Anteproyecto aplazado con deadline vencido
    await createProject({
      title: "Diseño de Puente Peatonal con Materiales Reciclados",
      description: "Análisis estructural de puente usando plástico reciclado.",
      programId: progCiv.id, modalityId: modTG.id,
      createdBy: s5, directorId: dir2, authors: [s5, s6],
      globalStatus: "VIGENTE",
      stages: [
        { stageName: "PROPUESTA", systemState: "CERRADA", officialState: "APROBADA" },
        { stageName: "ANTEPROYECTO", systemState: "CON_OBSERVACIONES", officialState: "APROBADA_CON_MODIFICACIONES" },
      ],
      jurors: [j1, j2],
      deadlines: [{ stageIndex: 1, description: "Correcciones anteproyecto", dueDaysFromNow: -5 }],
      auditEvents: [
        { eventType: "PROJECT_CREATED", description: "Proyecto creado" },
        { eventType: "PROPOSAL_EVALUATED", description: "Propuesta aprobada" },
        { eventType: "ANTEPROJECT_SUBMITTED", description: "Anteproyecto radicado" },
        { eventType: "ANTEPROJECT_ENDORSED", description: "Aval del director otorgado" },
        { eventType: "JURORS_ASSIGNED", description: "2 jurados asignados" },
        { eventType: "ANTEPROJECT_CONSOLIDATED", description: "Consolidado: aprobado con modificaciones" },
      ],
    });

    // P4: Anteproyecto aprobado
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
      jurors: [j2, j3],
      auditEvents: [
        { eventType: "PROJECT_CREATED", description: "Proyecto creado" },
        { eventType: "PROPOSAL_EVALUATED", description: "Propuesta aprobada" },
        { eventType: "ANTEPROJECT_CONSOLIDATED", description: "Anteproyecto aprobado" },
        { eventType: "STAGE_CREATED", description: "Etapa Informe Final habilitada" },
      ],
    });

    // P5: Informe final en evaluación
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
      jurors: [j1, j3],
      deadlines: [{ stageIndex: 2, description: "Plazo evaluación informe final", dueDaysFromNow: 1 }],
      auditEvents: [
        { eventType: "PROJECT_CREATED", description: "Proyecto creado" },
        { eventType: "INFORME_SUBMITTED", description: "Informe final radicado" },
        { eventType: "INFORME_ENDORSED", description: "Aval del director para informe final" },
        { eventType: "JURORS_ASSIGNED", description: "Jurados asignados para informe final" },
      ],
    });

    // P6: Informe final aprobado, sustentación pendiente
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
      stages: [
        { stageName: "PROPUESTA", systemState: "CERRADA", officialState: "APROBADA" },
      ],
      auditEvents: [
        { eventType: "PROJECT_CREATED", description: "Proyecto creado" },
        { eventType: "PROJECT_CANCELLED", description: "Proyecto cancelado por solicitud del estudiante" },
      ],
    });

    return new Response(JSON.stringify({
      success: true,
      message: "Seed completo: 12 usuarios, 10 proyectos con etapas, deadlines y audit_events",
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
