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
            <Route path="/proposals" element={<ProposalsList />} />
            <Route path="/proposals/:stageId/evaluate" element={<EvaluateProposal />} />
            <Route path="/anteproyecto/:stageId/endorse" element={<EndorseAnteproject />} />
            <Route path="/anteproyecto/:stageId/assign-jurors" element={<AssignJurors />} />
            <Route path="/anteproyecto/:stageId/evaluate" element={<EvaluateAnteproject />} />
            <Route path="/anteproyecto/:stageId/consolidate" element={<ConsolidateAnteproject />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
