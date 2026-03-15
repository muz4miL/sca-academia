import { useState, useEffect } from "react";
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
  ClipboardCheck,
  Globe,
  Scan,
  ExternalLink,
  Package,
  UserCog,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

// Logo: Use src/assets/logo.png if available, fallback to public/logo.png
const logoSrc = "/logo.png";

// Navigation items with permission keys - SRS 2.0 Compliant
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
    icon: ClipboardCheck,
    label: "Attendance",
    path: "/attendance",
    permission: "students",
  },
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
    icon: Package,
    label: "Inventory",
    path: "/inventory",
    permission: "configuration",
    ownerOnly: true,
  },
  {
    icon: UserCog,
    label: "Users",
    path: "/users",
    permission: "users",
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Close mobile sidebar on window resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Get user permissions (OWNER gets all permissions automatically)
  const userPermissions = user?.permissions || ["dashboard"];
  const isOwner = user?.role === "OWNER";

  // Filter nav items based on user permissions and role
  const filteredNavItems = navItems.filter((item) => {
    if (isOwner) return true;
    if (item.ownerOnly) return false;
    return userPermissions.includes(item.permission);
  });

  const sidebarContent = (
    <>
      {/* Sidebar Header - Standard Coaching Academy Gold & Navy Theme */}
      <div className="border-b border-[#F5A623]/20 px-4 py-5 shrink-0">
        {!collapsed && (
          <div className="flex flex-col items-center gap-2">
            <img
              src={logoSrc}
              alt="STANDARD COACHING ACADEMY"
              className="h-20 w-auto object-contain"
            />
            <p className="text-[10px] font-semibold text-[#F5A623]/80 tracking-widest uppercase">
              Enterprise ERP
            </p>
          </div>
        )}
        {collapsed && (
          <img
            src={logoSrc}
            alt="STANDARD COACHING ACADEMY"
            className="mx-auto h-10 w-10 object-contain"
          />
        )}
      </div>

      {/* Navigation - scrollable flex-1 area */}
      <nav
        className="mt-2 flex flex-col gap-1 px-2 overflow-y-auto sidebar-scrollbar flex-1 min-h-0"
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
                  ? "bg-[#F5A623] text-[#0D1442]"
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
      <div className="border-t border-sidebar-border pt-3 px-2 bg-sidebar shrink-0">
        {!collapsed && (
          <div className="px-3 mb-2">
            <p className="text-[10px] font-semibold text-[#F5A623]/60 tracking-widest uppercase">
              System Apps
            </p>
          </div>
        )}
        
        {/* Public Website */}
        <button
          onClick={() => window.open("/public", "_blank")}
          className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200 mb-1"
        >
          <Globe className="h-5 w-5 shrink-0" />
          {!collapsed && (
            <>
              <span>Public Website</span>
              <ExternalLink className="h-3 w-3 ml-auto opacity-50" />
            </>
          )}
        </button>

        {/* Gatekeeper Station */}
        <button
          onClick={() => window.open("/gatekeeper", "_blank")}
          className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200"
        >
          <Scan className="h-5 w-5 shrink-0" />
          {!collapsed && (
            <>
              <span>Gatekeeper Station</span>
              <ExternalLink className="h-3 w-3 ml-auto opacity-50" />
            </>
          )}
        </button>
      </div>

      {/* Collapse button - only on desktop */}
      <div className="shrink-0 hidden md:flex justify-center py-3">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-sidebar-border bg-sidebar-accent text-sidebar-foreground shadow-lg transition-colors hover:bg-[#F5A623] hover:text-[#0D1442]"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 md:hidden flex h-10 w-10 items-center justify-center rounded-lg bg-[#1A237E] text-white shadow-lg"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-screen w-64 bg-sidebar transition-transform duration-300 ease-in-out flex flex-col md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Mobile close button */}
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-accent text-sidebar-foreground"
          aria-label="Close menu"
        >
          <X className="h-4 w-4" />
        </button>
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen bg-sidebar transition-all duration-300 ease-in-out flex-col hidden md:flex",
          collapsed ? "w-16" : "w-64",
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
