import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { UserRole } from "../data/network";
import { Shield, Mail, Lock } from "lucide-react";

interface LoginPageProps {
  onLogin: (user: { id: number; name: string; email: string; role: UserRole }) => void;
}

function getRedirectPath(role: UserRole) {
  switch (role) {
    case "Student":
      return "/student";
    case "Mentor":
      return "/leads";
    case "Founder":
      return "/founder";
    case "Volunteer":
      return "/volunteer";
    case "Admin":
      return "/admin";
    default:
      return "/network";
  }
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("http://localhost:3000/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Invalid credentials. Please try again.");
      }

      const data = await response.json();
      console.log("Logged in successfully:", data.user);
      onLogin(data.user);
      navigate(getRedirectPath(data.user.role));
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please check your server connection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-8 px-4 py-12">
      <div className="space-y-4 text-center text-white">
        <p className="text-sm uppercase tracking-[0.3em] text-[#3B82F6]/80">Secure Login Gate</p>
        <h1 className="text-4xl font-semibold sm:text-5xl">Access VJ Network</h1>
        <p className="text-sm text-[#9CA3AF]">
          Sign in to your account. Roles are automatically verified and mapped based on your email domain and prefix.
        </p>
      </div>

      <Card className="rounded-[24px] border border-[#1F2937] bg-[#111111] p-8 shadow-2xl">
        <CardHeader className="p-0 pb-6">
          <CardTitle className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield className="h-6 w-6 text-[#3B82F6]" />
            Credentials Sign In
          </CardTitle>
          <CardDescription className="text-[#9CA3AF]">
            Your connection is encrypted with SQLCipher database-level protection.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-xl border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-400">
                <p className="font-semibold">Login Blocked</p>
                <p className="mt-1">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold text-white">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-500" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-11 border-[#1F2937] bg-[#0A0A0A] text-white focus:border-[#3B82F6] rounded-xl"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold text-white">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-500" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-11 border-[#1F2937] bg-[#0A0A0A] text-white focus:border-[#3B82F6] rounded-xl"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-[#3B82F6] hover:bg-[#2563EB] text-white font-semibold rounded-xl transition duration-200"
            >
              {loading ? "Verifying..." : "Continue to Dashboard"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
