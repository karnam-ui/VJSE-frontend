import { Link, NavLink, useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import { RoleBadge } from "./RoleBadge";
import { UserRole } from "../data/network";

const navLinks = [
  { label: "Problems", to: "/network" },
  { label: "Ideas", to: "/network" },
  { label: "Network", to: "/network" },
  { label: "Programs", to: "/network" },
  { label: "Club", to: "/network" },
];

interface TopNavProps {
  user: { fullName: string; role: UserRole } | null;
  onLogout: () => void;
}

export function TopNav({ user, onLogout }: TopNavProps) {
  const navigate = useNavigate();
  return (
    <header className="border-b border-[#1F2937] bg-[#0A0A0A]/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link to="/network" className="flex items-center gap-3 text-sm font-semibold text-white">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#111111] text-[#3B82F6]">🚀</span>
          <div className="flex flex-col leading-tight">
            <span className="text-base font-semibold">VJ Startups</span>
          </div>
        </Link>

        <div className="hidden md:block text-lg font-bold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-300">
          VJ Startups Support Ecosystem
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3 rounded-full border border-[#1F2937] bg-[#111111] px-3 py-2 text-sm text-[#E5E7EB] shadow-sm">
              <Avatar className="bg-[#1F2937] text-white">
                <AvatarFallback>{user.fullName.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="hidden flex-col text-left sm:flex">
                <span className="font-semibold text-white">{user.fullName}</span>
                <RoleBadge role={user.role} />
              </div>
              <Link
                to={
                  user.role === "Student" ? "/student" :
                  user.role === "Mentor" ? "/leads" :
                  user.role === "Volunteer" ? "/volunteer" :
                  user.role === "Admin" ? "/admin" :
                  "/founder"
                }
                className="text-xs text-[#3B82F6] hover:text-[#2563EB] hover:underline font-semibold px-2"
              >
                Dashboard
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onLogout();
                  navigate("/login");
                }}
                className="hidden sm:inline-flex"
              >
                Logout
              </Button>
            </div>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={() => navigate("/login")}
              className="bg-[#3B82F6] text-white hover:bg-[#1D4ED8]"
            >
              Login
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
