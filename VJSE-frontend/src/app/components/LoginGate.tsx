import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";

interface LoginGateProps {
  onLogin?: () => void;
}

export function LoginGate({ onLogin }: LoginGateProps) {
  const navigate = useNavigate();
  return (
    <Card className="mx-auto max-w-xl rounded-[18px] border border-[#1F2937] bg-gradient-to-br from-[#111111] via-[#121212] to-[#111111] p-px shadow-xl">
      <CardContent className="rounded-[18px] bg-[#111111] px-8 py-10 text-center text-white">
        <CardHeader className="gap-4">
          <span className="text-sm uppercase tracking-[0.3em] text-[#3B82F6]/90">Login required</span>
          <CardTitle className="text-3xl font-semibold">Login to Continue</CardTitle>
          <CardDescription className="text-[#9CA3AF]">
            Sign in to access the network search and submit a lead with your referral details.
          </CardDescription>
        </CardHeader>
        <Button
          variant="default"
          size="lg"
          onClick={() => navigate("/login")}
          className="mx-auto mt-8 w-full max-w-[240px] bg-[#F59E0B] text-[#0F172A] hover:bg-[#D97706]"
        >
          Login to Continue
        </Button>
      </CardContent>
    </Card>
  );
}
