import { Sidebar } from "@/components/sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Fixed sidebar with its own scrolling */}
      <div className="sticky top-0 h-screen flex-shrink-0">
        <Sidebar />
      </div>
      
      {/* Main content area with independent scrolling */}
      <main className="flex-1 overflow-auto max-h-screen">
        <div className="container py-6">
          {children}
        </div>
      </main>
    </div>
  );
}
