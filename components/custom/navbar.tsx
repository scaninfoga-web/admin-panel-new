"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { getCookie, deleteCookie } from "cookies-next";
import { LogOut, ChevronDown } from "lucide-react";

const VALID_ENVS = ["DEVELOPMENT", "PRODUCTION"] as const;

const Navbar: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();

  const [token, setToken] = useState<string | null>(null);
  const [env, setEnv] = useState<string>("DEVELOPMENT");
  const [envOpen, setEnvOpen] = useState(false);

  useEffect(() => {
    const raw = getCookie("accessToken");
    if (raw) {
      try {
        setToken(typeof raw === "string" ? JSON.parse(raw) : null);
      } catch {
        setToken(typeof raw === "string" ? raw : null);
      }
    }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("environment");
    const envValue =
      typeof saved === "string" &&
      VALID_ENVS.includes(saved as (typeof VALID_ENVS)[number])
        ? saved
        : "DEVELOPMENT";
    setEnv(envValue);
    if (saved !== envValue) localStorage.setItem("environment", envValue);
  }, []);

  const handleEnvChange = (value: string) => {
    setEnv(value);
    localStorage.setItem("environment", value);
    setEnvOpen(false);
  };

  const handleLogout = () => {
    deleteCookie("accessToken");
    deleteCookie("user");
    sessionStorage.removeItem("client_info");
    setToken(null);
    router.replace("/");
  };

  if (pathname === "/") return null;

  return (
    <header className="fixed top-0 z-50 w-full border-b border-white/[0.06] bg-[#05070B]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between px-5">
        {/* Logo */}
        <div className="flex shrink-0 items-center">
          <Image
            src="https://d29bvka1s4r8lj.cloudfront.net/scaninfoga_stuff/upper_logo.png"
            alt="scaninfoga"
            width={140}
            height={0}
            style={{ objectFit: "contain" }}
            unoptimized
            priority
          />
        </div>

        {/* Spacer — nav links moved to sidebar */}
        <div className="flex-1" />

        {/* Right section */}
        <div className="flex items-center gap-3">
          {/* Env badge */}
          {token && (
            <div className="relative">
              <button
                onClick={() => setEnvOpen(!envOpen)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider transition",
                  env === "PRODUCTION"
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                    : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    env === "PRODUCTION" ? "bg-amber-400" : "bg-emerald-400",
                  )}
                />
                {env === "PRODUCTION" ? "PROD" : "DEV"}
                <ChevronDown className="h-3 w-3 opacity-60" />
              </button>

              {envOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setEnvOpen(false)}
                  />
                  <div className="absolute right-0 top-full z-50 mt-1.5 w-40 overflow-hidden rounded-lg border border-white/10 bg-[#0C0F16] shadow-xl">
                    {VALID_ENVS.map((v) => (
                      <button
                        key={v}
                        onClick={() => handleEnvChange(v)}
                        className={cn(
                          "flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium transition",
                          env === v
                            ? "bg-white/[0.06] text-white"
                            : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200",
                        )}
                      >
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            v === "PRODUCTION"
                              ? "bg-amber-400"
                              : "bg-emerald-400",
                          )}
                        />
                        {v === "PRODUCTION" ? "Production" : "Development"}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Logout */}
          {token && (
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium text-red-400 transition hover:bg-red-500/10"
            >
              <LogOut className="h-3.5 w-3.5" />
              Logout
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
