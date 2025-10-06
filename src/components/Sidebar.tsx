import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  CheckSquare,
  FileText,
  Users,
  BarChart3,
  FolderOpen,
  Settings,
  History,
  Bell,
  Upload,
  AlertCircle,
  Wrench,
  MessageSquare,
} from "lucide-react";

interface SidebarProps {
  userRole: string;
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export default function Sidebar({ userRole }: SidebarProps) {
  const getNavItems = (): NavItem[] => {
    switch (userRole) {
      case 'beadle':
        return [
          { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
          { title: "Submit Attendance", href: "/attendance", icon: CheckSquare },
          { title: "Reports", href: "/analytics", icon: FileText },
        ];
      
      case 'adviser':
        return [
          { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
          { title: "Sections", href: "/dashboard", icon: Users },
          { title: "Masterlist Upload", href: "/csv-upload", icon: Upload },
          { title: "Alerts", href: "/dashboard", icon: AlertCircle },
          { title: "Reports", href: "/analytics", icon: BarChart3 },
        ];
      
      case 'coordinator':
        return [
          { title: "Overview", href: "/dashboard", icon: LayoutDashboard },
          { title: "Analytics", href: "/analytics", icon: BarChart3 },
          { title: "Sections", href: "/dashboard", icon: Users },
          { title: "File Storage", href: "/file-storage", icon: FolderOpen },
          { title: "Telegram Setup", href: "/dashboard", icon: MessageSquare },
          { title: "Reports", href: "/analytics", icon: FileText },
        ];
      
      case 'admin':
        return [
          { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
          { title: "Users", href: "/dashboard", icon: Users },
          { title: "System Settings", href: "/dashboard", icon: Settings },
          { title: "Audit Logs", href: "/dashboard", icon: History },
          { title: "Notifications", href: "/dashboard", icon: Bell },
          { title: "Setup", href: "/dashboard", icon: Wrench },
        ];
      
      default:
        return [
          { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        ];
    }
  };

  const navItems = getNavItems();

  return (
    <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card/50 backdrop-blur-sm">
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                "hover:bg-primary/10 hover:scale-105",
                isActive
                  ? "bg-gradient-to-r from-primary/20 to-accent/20 text-primary font-medium shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={cn("h-5 w-5", isActive && "animate-pulse-slow")} />
                <span>{item.title}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Role Badge */}
      <div className="p-4 border-t border-border">
        <div className="px-4 py-2 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 text-sm">
          <span className="text-muted-foreground">Role:</span>
          <span className="ml-2 font-medium capitalize gradient-text">{userRole}</span>
        </div>
      </div>
    </aside>
  );
}
