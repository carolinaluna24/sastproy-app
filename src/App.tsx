import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AppLayout from "./components/AppLayout";
import CreateProject from "./pages/projects/CreateProject";
import SubmitProposal from "./pages/projects/SubmitProposal";
import ProjectDetail from "./pages/projects/ProjectDetail";
import ProposalsList from "./pages/proposals/ProposalsList";
import EvaluateProposal from "./pages/proposals/EvaluateProposal";
import SubmitAnteproject from "./pages/anteproyecto/SubmitAnteproject";
import EndorseAnteproject from "./pages/anteproyecto/EndorseAnteproject";
import AssignJurors from "./pages/anteproyecto/AssignJurors";
import EvaluateAnteproject from "./pages/anteproyecto/EvaluateAnteproject";
import ConsolidateAnteproject from "./pages/anteproyecto/ConsolidateAnteproject";
import SubmitInformeFinal from "./pages/informe-final/SubmitInformeFinal";
import EndorseInformeFinal from "./pages/informe-final/EndorseInformeFinal";
import AssignJurorsInformeFinal from "./pages/informe-final/AssignJurorsInformeFinal";
import EvaluateInformeFinal from "./pages/informe-final/EvaluateInformeFinal";
import ConsolidateInformeFinal from "./pages/informe-final/ConsolidateInformeFinal";
import ScheduleDefense from "./pages/sustentacion/ScheduleDefense";
import RecordDefenseResult from "./pages/sustentacion/RecordDefenseResult";
import SubmitFinalDelivery from "./pages/sustentacion/SubmitFinalDelivery";
import CoordinatorReports from "./pages/reports/CoordinatorReports";
import DeadlinesRisk from "./pages/reports/DeadlinesRisk";
import ProjectsReport from "./pages/reports/ProjectsReport";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/projects/new" element={<CreateProject />} />
            <Route path="/projects/:projectId" element={<ProjectDetail />} />
            <Route path="/projects/:projectId/submit-proposal" element={<SubmitProposal />} />
            <Route path="/projects/:projectId/submit-anteproject" element={<SubmitAnteproject />} />
            <Route path="/projects/:projectId/submit-informe-final" element={<SubmitInformeFinal />} />
            <Route path="/projects/:projectId/submit-final-delivery" element={<SubmitFinalDelivery />} />
            <Route path="/proposals" element={<ProposalsList />} />
            <Route path="/proposals/:stageId/evaluate" element={<EvaluateProposal />} />
            {/* Anteproyecto */}
            <Route path="/anteproyecto/:stageId/endorse" element={<EndorseAnteproject />} />
            <Route path="/anteproyecto/:stageId/assign-jurors" element={<AssignJurors />} />
            <Route path="/anteproyecto/:stageId/evaluate" element={<EvaluateAnteproject />} />
            <Route path="/anteproyecto/:stageId/consolidate" element={<ConsolidateAnteproject />} />
            {/* Informe Final */}
            <Route path="/informe-final/:stageId/endorse" element={<EndorseInformeFinal />} />
            <Route path="/informe-final/:stageId/assign-jurors" element={<AssignJurorsInformeFinal />} />
            <Route path="/informe-final/:stageId/evaluate" element={<EvaluateInformeFinal />} />
            <Route path="/informe-final/:stageId/consolidate" element={<ConsolidateInformeFinal />} />
            {/* Sustentación */}
            <Route path="/sustentacion/:stageId/schedule" element={<ScheduleDefense />} />
            <Route path="/sustentacion/:stageId/record-result" element={<RecordDefenseResult />} />
            {/* Reportes (Coordinador) */}
            <Route path="/reports" element={<CoordinatorReports />} />
            <Route path="/reports/deadlines" element={<DeadlinesRisk />} />
            <Route path="/reports/projects" element={<ProjectsReport />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
