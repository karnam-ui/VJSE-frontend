import { UserRole } from "../data/network";

interface RoleBadgeProps {
  role: UserRole;
}

const styleMap: Record<RoleBadgeProps["role"], string> = {
  Student: "bg-[#1F2937] text-[#9CA3AF] border border-[#2D3748]",
  Mentor: "bg-[#10B981] text-white",
  Founder: "bg-[#3B82F6] text-white",
  Volunteer: "bg-[#F59E0B] text-[#0F172A]",
  Admin: "bg-[#EF4444] text-white",
};

export function RoleBadge({ role }: RoleBadgeProps) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] ${styleMap[role]}`}>
      {role}
    </span>
  );
}
