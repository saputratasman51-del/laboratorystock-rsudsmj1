import { useEffect, useState } from "react";
import { StoreProvider, useStore } from "./store/store";
import { AuthProvider, useAuth } from "./store/auth";
import { ToastProvider } from "./components/Toast";
import { useHashRoute } from "./router";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import LoginPage from "./pages/LoginPage";
import { PAGE_META } from "./data/labstock";
import DashboardPage from "./pages/DashboardPage";
import KatalogPage from "./pages/KatalogPage";
import BatchPage from "./pages/BatchPage";
import BmhpPage from "./pages/BmhpPage";
import PemakaianPage from "./pages/PemakaianPage";
import PermintaanPage from "./pages/PermintaanPage";
import PenerimaanPage from "./pages/PenerimaanPage";
import PoPage from "./pages/PoPage";
import VendorPage from "./pages/VendorPage";
import LaporanPage from "./pages/LaporanPage";
import FefoPage from "./pages/FefoPage";
import AuditPage from "./pages/AuditPage";
import { ShieldCheck } from "lucide-react";

function Shell() {
  const [path, navigate] = useHashRoute();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const meta = PAGE_META[path] ?? PAGE_META["dashboard-alert-center"];

  const page = (() => {
    switch (path) {
      case "dashboard-alert-center": return <DashboardPage navigate={navigate} />;
      case "katalog-stok-reagensia": return <KatalogPage />;
      case "pelacakan-batch-lot": return <BatchPage />;
      case "manajemen-bmhp-alkes": return <BmhpPage />;
      case "pencatatan-pemakaian-harian": return <PemakaianPage />;
      case "permintaan-stok-internal": return <PermintaanPage />;
      case "penerimaan-barang": return <PenerimaanPage />;
      case "purchase-order-e-katalog": return <PoPage navigate={navigate} />;
      case "daftar-vendor-supplier": return <VendorPage />;
      case "laporan-mutasi-valuasi": return <LaporanPage />;
      case "peringatan-fefo-expired": return <FefoPage />;
      case "log-audit-kars-iso": return <AuditPage />;
      default: return <DashboardPage navigate={navigate} />;
    }
  })();

  return (
    <div className="min-h-screen bg-background text-on-surface antialiased">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} path={path} navigate={navigate} />

      <div className="lg:pl-64">
        <TopBar onMenu={() => setSidebarOpen(true)} path={path} navigate={navigate} />

        <main className="min-h-screen w-full pt-16">
          <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-4 py-5 md:px-6">
            <header key={path} className="animate-rise">
              <h1 className="font-sans text-headline-lg tracking-tight text-on-surface">{meta.title}</h1>
              <p className="mt-1 max-w-2xl font-sans text-body-sm text-on-surface-variant">{meta.desc}</p>
            </header>

            <div key={path + "-body"} className="animate-rise" style={{ animationDelay: "70ms" }}>
              {page}
            </div>

            <footer className="flex flex-col items-center justify-between gap-2 pb-2 pt-4 sm:flex-row">
              <div className="flex items-center gap-1.5 font-sans text-caption font-normal text-on-surface-variant">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span>Labstock RSUD SMJ — Pencatatan &amp; Pelaporan Internal Laboratorium · KARS &amp; ISO 15189</span>
              </div>
              <span className="font-mono text-data-mono-sm text-secondary">Lab PK &amp; UPD · WIB</span>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}

function Gate() {
  const { session } = useAuth();
  const { setActor } = useStore();

  useEffect(() => {
    if (session) setActor(session.name);
  }, [session, setActor]);

  if (!session) return <LoginPage />;
  return <Shell key={session.id} />;
}

export default function App() {
  return (
    <AuthProvider>
      <StoreProvider>
        <ToastProvider>
          <Gate />
        </ToastProvider>
      </StoreProvider>
    </AuthProvider>
  );
}
