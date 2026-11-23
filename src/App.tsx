import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ToastProvider } from "@/components/Toast";
import { DashboardLayout } from "@/components/DashboardLayout";
import { LoginPage } from "@/pages/LoginPage";
import { ResetPasswordPage } from "@/pages/ResetPasswordPage";
import { OrdersList } from "@/pages/OrdersList";
import { OwnerOverview } from "@/pages/owner/OwnerOverview";
import { OwnerMenu } from "@/pages/owner/OwnerMenu";
import { OwnerTables } from "@/pages/owner/OwnerTables";
import { OwnerStaff } from "@/pages/owner/OwnerStaff";
import { OwnerReports, OwnerInventory } from "@/pages/owner/OwnerReports";
import { OwnerSettings } from "@/pages/owner/OwnerSettings";
import { WaiterTables, WaiterBills } from "@/pages/waiter/WaiterDashboard";
import { KitchenDashboard } from "@/pages/kitchen/KitchenDashboard";
import { CustomerMenu, OrderTracking } from "@/pages/customer/CustomerMenu";
import { OnlineOrdering } from "@/pages/customer/OnlineOrdering";
import type { Role } from "@/types";

function RequireAuth({ allow, children }: { allow: Role[]; children: ReactNode }) {
  const { session, staff, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-stone-100"><p className="text-stone-400">Loading…</p></div>;
  }
  if (!session || !staff) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (!allow.includes(staff.role)) {
    // Redirect to the user's correct home
    return <Navigate to="/" replace />;
  }
  return <DashboardLayout>{children}</DashboardLayout>;
}

function RoleHome() {
  const { staff } = useAuth();
  if (!staff) return <Navigate to="/login" replace />;
  switch (staff.role) {
    case "owner": return <OwnerOverview />;
    case "waiter": return <WaiterTables />;
    case "kitchen": return <KitchenDashboard />;
    default: return <Navigate to="/login" replace />;
  }
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public customer routes */}
      <Route path="/menu/:tableId" element={<CustomerMenu />} />
      <Route path="/track/:orderId/:token" element={<OrderTracking />} />
      <Route path="/order/:slug" element={<OnlineOrdering />} />

      {/* Login */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Owner routes */}
      <Route path="/" element={<RequireAuth allow={["owner", "waiter", "kitchen"]}><RoleHome /></RequireAuth>} />
      <Route path="/menu" element={<RequireAuth allow={["owner"]}><OwnerMenu /></RequireAuth>} />
      <Route path="/tables" element={<RequireAuth allow={["owner", "waiter"]}> <RoleRoute owner={<OwnerTables />} waiter={<WaiterTables />} /> </RequireAuth>} />
      <Route path="/orders" element={<RequireAuth allow={["owner", "waiter", "kitchen"]}> <RoleRouteOrders /> </RequireAuth>} />
      <Route path="/staff" element={<RequireAuth allow={["owner"]}><OwnerStaff /></RequireAuth>} />
      <Route path="/reports" element={<RequireAuth allow={["owner"]}><OwnerReports /></RequireAuth>} />
      <Route path="/inventory" element={<RequireAuth allow={["owner"]}><OwnerInventory /></RequireAuth>} />
      <Route path="/settings" element={<RequireAuth allow={["owner"]}><OwnerSettings /></RequireAuth>} />
      <Route path="/bills" element={<RequireAuth allow={["waiter"]}><WaiterBills /></RequireAuth>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function RoleRoute({ owner, waiter }: { owner: ReactNode; waiter: ReactNode }) {
  const { staff } = useAuth();
  if (staff?.role === "owner") return <>{owner}</>;
  if (staff?.role === "waiter") return <>{waiter}</>;
  return <Navigate to="/" replace />;
}

function RoleRouteOrders() {
  const { staff } = useAuth();
  // All roles see the orders list, but owner sees full list, waiter/kitchen see filtered
  return <OrdersList title={staff?.role === "kitchen" ? "Active Orders" : "Orders"} />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
