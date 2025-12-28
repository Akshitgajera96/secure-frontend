import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Upload from "./pages/Upload";
import Viewer from "./pages/Viewer";
import PdfViewer from "./pages/PdfViewer";
import OutputPreview from "./pages/OutputPreview";
import Demo from "./pages/Demo";
import EditorPage from "./pages/EditorPage";
import Auth from "./pages/Auth";
import CreateUser from "./pages/CreateUser";
import Printing from "./pages/Printing";
import NotFound from "./pages/NotFound";
import AdminUsersSessions from "./pages/AdminUsersSessions";
import Security from "./pages/Security";

const queryClient = new QueryClient();

// Protected route component
const ProtectedRoute = ({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (adminOnly && user.role !== 'admin') {
    // Non-admin ko admin pages se printing dashboard pe bhejo
    return <Navigate to="/printing" replace />;
  }

  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/upload" element={
              <ProtectedRoute adminOnly>
                <Upload />
              </ProtectedRoute>
            } />
            <Route path="/viewer" element={
              <ProtectedRoute>
                <Viewer />
              </ProtectedRoute>
            } />
            <Route path="/pdf-viewer" element={
              <ProtectedRoute>
                <PdfViewer />
              </ProtectedRoute>
            } />
            <Route path="/output/preview/:outputId" element={
              <ProtectedRoute adminOnly>
                <OutputPreview />
              </ProtectedRoute>
            } />
            <Route path="/output-preview" element={
              <ProtectedRoute adminOnly>
                <OutputPreview />
              </ProtectedRoute>
            } />
            <Route path="/output-preview/:previewId" element={
              <ProtectedRoute adminOnly>
                <OutputPreview />
              </ProtectedRoute>
            } />
            <Route path="/demo" element={<Demo />} />
            <Route path="/editor-shell" element={
              <ProtectedRoute adminOnly>
                <EditorPage />
              </ProtectedRoute>
            } />
            <Route path="/auth" element={<Auth />} />
            <Route path="/create-user" element={
              <ProtectedRoute adminOnly>
                <CreateUser />
              </ProtectedRoute>
            } />
            <Route path="/admin/users" element={
              <ProtectedRoute adminOnly>
                <AdminUsersSessions />
              </ProtectedRoute>
            } />
            <Route path="/printing" element={
              <ProtectedRoute>
                <Printing />
              </ProtectedRoute>
            } />
            <Route path="/security" element={
              <ProtectedRoute>
                <Security />
              </ProtectedRoute>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
