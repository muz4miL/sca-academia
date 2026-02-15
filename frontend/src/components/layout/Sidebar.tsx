import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  UserPlus,
  Users,
  DollarSign,
  Settings,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Clock,
  CalendarClock,
  GraduationCap,
  Phone,
  Banknote,
  ClipboardList,
  Armchair,
  Globe,
  Scan,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

// Logo: Use src/assets/logo.png if available, fallback to public/logo.png
const logoSrc = "/logo.png";

// Navigation items with permission keys - SRS 2.0 Compliant
// KEPT: Dashboard, Admissions, Students, Teachers, Finance, Classes, Timetable, Sessions, Configuration, Payroll
const navItems = [
  {
    icon: LayoutDashboard,
    label: "Dashboard",
    path: "/",
    permission: "dashboard",
  },
  {
    icon: UserPlus,
    label: "Admissions",
    path: "/admissions",
    permission: "admissions",
  },
  {
    icon: ClipboardList,
    label: "Registrations",
    path: "/registrations",
    permission: "admissions",
  },
  { icon: Users, label: "Students", path: "/students", permission: "students" },
  {
    icon: GraduationCap,
    label: "Teachers",
    path: "/teachers",
    permission: "teachers",
  },
  {
    icon: DollarSign,
    label: "Finance",
    path: "/finance",
    permission: "finance",
  },
  { icon: BookOpen, label: "Classes", path: "/classes", permission: "classes" },
  {
    icon: Armchair,
    label: "Seat Management",
    path: "/seat-management",
    permission: "classes",
  },
  {
    icon: Clock,
    label: "Timetable",
    path: "/timetable",
    permission: "timetable",
  },
  {
    icon: CalendarClock,
    label: "Sessions",
    path: "/sessions",
    permission: "sessions",
  },
  {
    icon: Phone,
    label: "Inquiries",
    path: "/leads",
    permission: "inquiries",
  },
  {
    icon: Banknote,
    label: "Payroll",
    path: "/payroll",
    permission: "payroll",
    ownerOnly: true,
  },
  {
    icon: Settings,
    label: "Configuration",
    path: "/configuration",
    permission: "configuration",
    ownerOnly: true,
  },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { user } = useAuth();

  // Get user permissions (OWNER gets all permissions automatically)
  const userPermissions = user?.permissions || ["dashboard"];
  const isOwner = user?.role === "OWNER";

  // Filter nav items based on user permissions and role
  const filteredNavItems = navItems.filter((item) => {
    // OWNER bypasses all permission checks
    if (isOwner) return true;

    // ownerOnly items are restricted to OWNER role
    if (item.ownerOnly) return false;

    // Check if user has permission for this item
    return userPermissions.includes(item.permission);
  });

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar transition-all duration-300 ease-in-out",
        collapsed ? "w-16" : "w-64",
      )}
    >
      {/* Sidebar Header - Sciences Coaching Academy Blue Theme */}
      <div className="border-b border-blue-500/20 px-4 py-5">
        {!collapsed && (
          <div className="flex flex-col items-center gap-2">
            <img
              src={logoSrc}
              alt="SCIENCES COACHING ACADEMY"
              className="h-20 w-auto object-contain"
            />
            <p className="text-[10px] font-semibold text-blue-400/80 tracking-widest uppercase">
              Enterprise ERP
            </p>
          </div>
        )}
        {collapsed && (
          <img
            src={logoSrc}
            alt="SCIENCES COACHING ACADEMY"
            className="mx-auto h-10 w-10 object-contain"
          />
        )}
      </div>

      {/* Navigation */}
      <nav
        className="mt-4 flex flex-col gap-1 px-2 overflow-y-auto sidebar-scrollbar"
        style={{ maxHeight: "calc(100vh - 300px)" }}
      >
        {filteredNavItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* System Apps Section */}
      <div className="absolute bottom-16 left-0 right-0 border-t border-sidebar-border pt-3 px-2 bg-sidebar">
        {!collapsed && (
          <div className="px-3 mb-2">
            <p className="text-[10px] font-semibold text-blue-400/60 tracking-widest uppercase">
              System Apps
            </p>
          </div>
        )}
        
        {/* Public Website */}
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200 mb-1"
        >
          <Globe className="h-5 w-5 shrink-0" />
          {!collapsed && (
            <>
              <span>Public Website</span>
              <ExternalLink className="h-3 w-3 ml-auto opacity-50" />
            </>
          )}
        </a>

        {/* Gatekeeper Station */}
        <a
          href="/gatekeeper"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200"
        >
          <Scan className="h-5 w-5 shrink-0" />
          {!collapsed && (
            <>
              <span>Gatekeeper Station</span>
              <ExternalLink className="h-3 w-3 ml-auto opacity-50" />
            </>
          )}
        </a>
      </div>

      {/* Collapse button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute bottom-4 left-1/2 z-50 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border border-sidebar-border bg-sidebar-accent text-sidebar-foreground shadow-lg transition-colors hover:bg-primary hover:text-primary-foreground"
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </button>
    </aside>
  );
}
