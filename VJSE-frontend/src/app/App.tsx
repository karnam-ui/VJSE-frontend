import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { TopNav } from "./components/TopNav";
import { LandingPage } from "./pages/LandingPage";
import { SubmitLeadPage } from "./pages/SubmitLeadPage";
import { SearchPage } from "./pages/SearchPage";
import { VolunteerPage } from "./pages/VolunteerPage";
import { AdminPage } from "./pages/AdminPage";
import { LoginPage } from "./pages/LoginPage";
import { StudentPage } from "./pages/StudentPage";
import { LeadsPage } from "./pages/LeadsPage";
import { FounderPage } from "./pages/FounderPage";
import { Toast } from "./components/Toast";
import { UserRole } from "./data/network";
import { api } from "./data/api";

type AppUser = {
  id: number;
  fullName: string;
  email: string;
  role: UserRole;
};

const defaultUser: AppUser = {
  id: 3,
  fullName: "Aditi Sharma",
  email: "aditi.sharma@vj.edu",
  role: "Founder",
};

export default function App() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [toastMessage, setToastMessage] = useState("");

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(""), 3200);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  // Restore authenticated session on mount
  useEffect(() => {
    async function checkAuthSession() {
      try {
        const response = await api.get("/check-auth");
        const userPayload = response.data.user || response.data;
        if (userPayload && userPayload.email) {
          setUser({
            id: userPayload.id || 1,
            fullName: userPayload.fullName || userPayload.name || "VJ User",
            email: userPayload.email,
            role: userPayload.role || "Student",
          });
        }
      } catch (err) {
        console.log("No active session found:", err);
        // Clear invalid token
        localStorage.removeItem("token");
        setUser(null);
      }
    }
    checkAuthSession();
  }, []);

  function handleLogin(
    loginData: UserRole | { id: number; name: string; email: string; role: UserRole },
    token?: string
  ) {
    if (token) {
      localStorage.setItem("token", token);
    }
    if (typeof loginData === "string") {
      setUser({
        id: loginData === "Student" ? 1 : loginData === "Founder" ? 3 : 2,
        fullName: `Demo ${loginData}`,
        email: `${loginData.toLowerCase()}@vnrvjiet.in`,
        role: loginData,
      });
    } else {
      setUser({
        id: loginData.id,
        fullName: loginData.name,
        email: loginData.email,
        role: loginData.role,
      });
    }
  }

  async function handleLogout() {
    try {
      await api.post("/logout");
    } catch (err) {
      console.error("Logout request failed:", err);
    } finally {
      localStorage.removeItem("token");
      setUser(null);
    }
  }

  function handleSubmitSuccess() {
    setToastMessage("Your lead has been submitted successfully.");
  }

  return (
    <BrowserRouter>
      <div className="dark min-h-screen bg-[#0A0A0A] text-white">
        <TopNav user={user} onLogout={handleLogout} />
        <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
          <Routes>
            <Route path="/" element={<Navigate replace to="/network" />} />
            <Route path="/network" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
            <Route
              path="/student"
              element={<StudentPage user={user} onLogin={() => handleLogin("Student")} onSubmit={handleSubmitSuccess} />}
            />
            <Route
              path="/submit-lead"
              element={<SubmitLeadPage user={user} onLogin={() => handleLogin("Student")} onSubmit={handleSubmitSuccess} />}
            />
            <Route
              path="/leads"
              element={<LeadsPage user={user} onLogin={() => handleLogin("Mentor")} />}
            />
            <Route path="/search" element={<SearchPage user={user} onLogin={() => handleLogin("Founder")} />} />
            <Route path="/founder" element={<FounderPage user={user} onLogin={() => handleLogin("Founder")} />} />
            <Route path="/volunteer" element={<VolunteerPage user={user} onLogin={() => handleLogin("Volunteer")} />} />
            <Route path="/admin" element={<AdminPage user={user} onLogin={() => handleLogin("Admin")} />} />
            <Route path="*" element={<Navigate replace to="/network" />} />
          </Routes>
        </main>
        {toastMessage ? <Toast message={toastMessage} /> : null}
      </div>
    </BrowserRouter>
  );
}
