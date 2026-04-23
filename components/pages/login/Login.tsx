"use client";

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  type KeyboardEvent,
} from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { setCookie } from "cookies-next";
import {
  ShieldCheck,
  Lock,
  Mail,
  KeyRound,
  ArrowRight,
  Activity,
  Globe2,
  Fingerprint,
  Loader2,
  CheckCircle2,
  Smartphone,
  RotateCcw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { post } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

/* ─── Helpers ─── */
function saveCredentials(accessToken: string, user: any) {
  const maxAge = 59 * 60; // 59 minutes in seconds
  setCookie("accessToken", JSON.stringify(accessToken), { path: "/", maxAge });
  setCookie("user", JSON.stringify(user), { path: "/", maxAge });
}

type OtpChannel = "EMAIL" | "WHATSAPP";

/* ─── Shared pin helpers ─── */
function pinDigitChange(
  index: number,
  value: string,
  digits: string[],
  setDigits: (d: string[]) => void,
  refs: React.MutableRefObject<(HTMLInputElement | null)[]>,
  onComplete: (code: string) => void,
) {
  const cleaned = value.replace(/\D/g, "");
  if (!cleaned) {
    const next = [...digits];
    next[index] = "";
    setDigits(next);
    return;
  }
  if (cleaned.length > 1) {
    const next = [...digits];
    cleaned
      .slice(0, 6 - index)
      .split("")
      .forEach((ch, i) => {
        next[index + i] = ch;
      });
    setDigits(next);
    refs.current[Math.min(index + cleaned.length, 5)]?.focus();
    if (next.every((d) => d !== "")) onComplete(next.join(""));
    return;
  }
  const next = [...digits];
  next[index] = cleaned;
  setDigits(next);
  if (index < 5) refs.current[index + 1]?.focus();
  if (next.every((d) => d !== "")) onComplete(next.join(""));
}

function pinKeyDown(
  index: number,
  e: KeyboardEvent<HTMLInputElement>,
  digits: string[],
  refs: React.MutableRefObject<(HTMLInputElement | null)[]>,
) {
  if (e.key === "Backspace" && !digits[index] && index > 0)
    refs.current[index - 1]?.focus();
}

function pinPaste(
  e: React.ClipboardEvent,
  setDigits: (d: string[]) => void,
  refs: React.MutableRefObject<(HTMLInputElement | null)[]>,
  onComplete: (code: string) => void,
) {
  e.preventDefault();
  const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
  if (!pasted) return;
  const next = Array(6).fill("");
  pasted.split("").forEach((ch, i) => (next[i] = ch));
  setDigits(next);
  refs.current[Math.min(pasted.length, 5)]?.focus();
  if (next.every((d) => d !== "")) onComplete(next.join(""));
}

/* ═══════════════════════════════════════════════════════════
   LOGIN COMPONENT
   ═══════════════════════════════════════════════════════════ */
type SigninStep = "mpin" | "channel" | "otp";
type ForgotStep = "channel" | "otp" | "new-mpin";

const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [loading, setLoading] = useState(false);

  // ── Signin dialog ──
  const [signinOpen, setSigninOpen] = useState(false);
  const [signinStep, setSigninStep] = useState<SigninStep>("mpin");
  const [signinToken, setSigninToken] = useState<string | null>(null);
  const [signinMpinCode, setSigninMpinCode] = useState("");
  const [signinOtpDest, setSigninOtpDest] = useState("");
  const [mpin, setMpin] = useState<string[]>(Array(6).fill(""));
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const mpinRefs = useRef<(HTMLInputElement | null)[]>([]);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // ── Forgot MPIN dialog ──
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<ForgotStep>("channel");
  const [forgotToken, setForgotToken] = useState<string | null>(null);
  const [forgotOtpDest, setForgotOtpDest] = useState("");
  const [forgotOtp, setForgotOtp] = useState<string[]>(Array(6).fill(""));
  const [newMpin, setNewMpin] = useState<string[]>(Array(6).fill(""));
  const forgotOtpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const newMpinRefs = useRef<(HTMLInputElement | null)[]>([]);

  /* ─── Email submit → open signin dialog ─── */
  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailError("Enter a valid email address");
      return;
    }
    setEmailError("");
    setMpin(Array(6).fill(""));
    setOtp(Array(6).fill(""));
    setSigninStep("mpin");
    setSigninMpinCode("");
    setSigninOpen(true);
  };

  /* ─── Signin: MPIN complete → show channel picker ─── */
  const handleMpinComplete = useCallback((code: string) => {
    setSigninMpinCode(code);
    setSigninStep("channel");
  }, []);

  /* ─── Signin: Channel selected → call API ─── */
  const handleSigninChannelSelect = useCallback(
    async (channel: OtpChannel) => {
      try {
        setLoading(true);
        const response = await post(
          "/api/v1/auth/signin",
          { email: email.trim(), mpin: signinMpinCode, otp_channel: channel },
          { withCredentials: true },
        );
        const { responseData, responseStatus } = response;

        if (responseData.requires_otp) {
          setSigninToken(responseData.token);
          setSigninOtpDest(
            responseData.otp_channel === "WHATSAPP" ? "WhatsApp" : "email",
          );
          setSigninStep("otp");
          setOtp(Array(6).fill(""));
          toast.info(responseStatus?.message || "OTP sent.");
          const focusOtp = (attempts = 0) => {
            if (attempts > 5) return;
            setTimeout(() => {
              const el = otpRefs.current[0];
              if (el && document.activeElement !== el) {
                el.focus();
                focusOtp(attempts + 1);
              }
            }, 150);
          };
          focusOtp();
        } else {
          saveCredentials(responseData.access_token, responseData.user);
          toast.success("Signed in successfully!", { duration: 800 });
          window.location.href = "/users";
        }
      } catch (error: any) {
        const msg =
          error?.response?.data?.responseStatus?.message ||
          "Invalid credentials. Try again.";
        toast.error(msg);
        setSigninStep("mpin");
        setMpin(Array(6).fill(""));
        setSigninMpinCode("");
        setTimeout(() => mpinRefs.current[0]?.focus(), 50);
      } finally {
        setLoading(false);
      }
    },
    [email, signinMpinCode],
  );

  /* ─── Signin: OTP complete ─── */
  const handleOtpComplete = useCallback(
    async (code: string) => {
      if (!signinToken) return;
      try {
        setLoading(true);
        const response = await post(
          "/api/v1/auth/signin/verify-otp",
          { token: signinToken, otp: code },
          { withCredentials: true },
        );
        const { responseData } = response;
        saveCredentials(responseData.access_token, responseData.user);
        toast.success("Signed in successfully!", { duration: 800 });
        window.location.href = "/users";
      } catch (error: any) {
        const msg =
          error?.response?.data?.responseStatus?.message ||
          "Invalid OTP. Try again.";
        toast.error(msg);
        setOtp(Array(6).fill(""));
        setTimeout(() => otpRefs.current[0]?.focus(), 50);
      } finally {
        setLoading(false);
      }
    },
    [signinToken],
  );

  /* ─── Forgot: open channel picker ─── */
  const handleForgotClick = () => {
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailError("Enter your email first, then click Forgot MPIN");
      return;
    }
    setEmailError("");
    setForgotStep("channel");
    setForgotOtp(Array(6).fill(""));
    setNewMpin(Array(6).fill(""));
    setForgotToken(null);
    setForgotOpen(true);
  };

  /* ─── Forgot: Channel selected → call API ─── */
  const handleForgotChannelSelect = useCallback(
    async (channel: OtpChannel) => {
      try {
        setLoading(true);
        const response = await post("/api/v1/auth/forgot-mpin", {
          email: email.trim(),
          otp_channel: channel,
        });
        const { responseData, responseStatus } = response;
        setForgotToken(responseData.token);
        setForgotOtpDest(
          responseData.otp_channel === "WHATSAPP" ? "WhatsApp" : "email",
        );
        setForgotStep("otp");
        setForgotOtp(Array(6).fill(""));
        toast.info(responseStatus?.message || "OTP sent.");
      } catch (error: any) {
        const msg =
          error?.response?.data?.responseStatus?.message ||
          "Failed to send OTP.";
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    },
    [email],
  );

  /* ─── Forgot: OTP entered → move to new MPIN ─── */
  const handleForgotOtpComplete = useCallback((code: string) => {
    setForgotOtp(code.split(""));
    setForgotStep("new-mpin");
    setNewMpin(Array(6).fill(""));
  }, []);

  /* ─── Forgot: New MPIN entered → verify ─── */
  const handleNewMpinComplete = useCallback(
    async (code: string) => {
      if (!forgotToken) return;
      try {
        setLoading(true);
        const response = await post("/api/v1/auth/forgot-mpin/verify-otp", {
          token: forgotToken,
          otp: forgotOtp.join(""),
          new_mpin: code,
        });
        toast.success(
          response?.responseStatus?.message ||
            "MPIN reset successfully! Please sign in.",
          { duration: 3000 },
        );
        setForgotOpen(false);
        setForgotToken(null);
      } catch (error: any) {
        const msg =
          error?.response?.data?.responseStatus?.message ||
          "Failed to reset MPIN.";
        toast.error(msg);
        if (msg.toLowerCase().includes("otp")) {
          setForgotStep("otp");
          setForgotOtp(Array(6).fill(""));
        } else {
          setNewMpin(Array(6).fill(""));
          setTimeout(() => newMpinRefs.current[0]?.focus(), 50);
        }
      } finally {
        setLoading(false);
      }
    },
    [forgotToken, forgotOtp],
  );

  /* ─── Signin step index for dots ─── */
  const signinStepIdx =
    signinStep === "mpin" ? 0 : signinStep === "channel" ? 1 : 2;
  const forgotStepIdx =
    forgotStep === "channel" ? 0 : forgotStep === "otp" ? 1 : 2;

  return (
    <>
      <div className="relative grid min-h-screen w-full grid-cols-1 overflow-hidden bg-[#05070B] lg:grid-cols-[1.1fr_1fr]">
        {/* ─── LEFT — BRAND PANEL ─── */}
        <div className="relative hidden overflow-hidden border-r border-emerald-500/10 lg:flex">
          <div
            className="absolute inset-0 opacity-[0.18]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(16,185,129,0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.25) 1px, transparent 1px)",
              backgroundSize: "52px 52px",
              maskImage:
                "radial-gradient(ellipse 80% 60% at 30% 40%, #000 40%, transparent 100%)",
            }}
          />
          <div className="absolute -top-32 -left-32 h-[440px] w-[440px] rounded-full bg-emerald-500/20 blur-[140px]" />
          <div className="absolute bottom-0 right-0 h-[380px] w-[380px] rounded-full bg-cyan-500/10 blur-[140px]" />

          <div className="relative z-10 flex w-full flex-col justify-between p-12 xl:p-16">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex items-center gap-3"
            >
              <div className="relative">
                <div className="absolute inset-0 rounded-xl bg-emerald-500/30 blur-md" />
                <div className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-400/30 bg-gradient-to-br from-emerald-500/20 to-emerald-500/5">
                  <ShieldCheck className="h-5 w-5 text-emerald-400" />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium leading-none text-white">
                  Scaninfoga
                </p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-emerald-400/80">
                  Admin Console
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="max-w-md space-y-6"
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1 text-[11px] font-medium text-emerald-300">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </span>
                Secure session — TLS 1.3
              </div>
              <h1 className="text-5xl font-semibold leading-[1.05] tracking-tight text-white xl:text-6xl">
                Control the
                <br />
                <span className="bg-gradient-to-r from-emerald-300 via-emerald-400 to-cyan-300 bg-clip-text text-transparent">
                  entire surface.
                </span>
              </h1>
              <p className="max-w-sm text-[15px] leading-relaxed text-zinc-400">
                A unified command center for monitoring users, payments, and
                intelligence operations across the Scaninfoga platform.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02]"
            >
              {[
                { icon: Activity, label: "Uptime", value: "99.99%" },
                { icon: Globe2, label: "Regions", value: "14" },
                { icon: Fingerprint, label: "MFA", value: "Enforced" },
              ].map(({ icon: Icon, label, value }) => (
                <div
                  key={label}
                  className="flex flex-col gap-2 bg-[#05070B] p-5"
                >
                  <Icon className="h-4 w-4 text-emerald-400/80" />
                  <p className="text-lg font-semibold text-white">{value}</p>
                  <p className="text-[11px] uppercase tracking-wider text-zinc-500">
                    {label}
                  </p>
                </div>
              ))}
            </motion.div>
          </div>
        </div>

        {/* ─── RIGHT — EMAIL FORM ─── */}
        <div className="relative flex items-center justify-center px-6 py-12 sm:px-12">
          <div className="pointer-events-none absolute inset-0 lg:hidden">
            <div className="absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-emerald-500/15 blur-3xl" />
          </div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="relative z-10 w-full max-w-[420px]"
          >
            <div className="mb-10 flex items-center gap-3 lg:hidden">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-500/10">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Scaninfoga</p>
                <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-400/80">
                  Admin Console
                </p>
              </div>
            </div>

            <div className="mb-8 space-y-2">
              <h2 className="text-3xl font-semibold tracking-tight text-white">
                Sign in
              </h2>
              <p className="text-sm text-zinc-400">
                Enter your email to access the admin console.
              </p>
            </div>

            <form onSubmit={handleEmailSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-zinc-400">
                  <span className="text-emerald-400/70">
                    <Mail className="h-4 w-4" />
                  </span>
                  Email
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError("");
                  }}
                  placeholder="admin@scaninfoga.com"
                  className="h-11 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 text-sm text-white placeholder:text-zinc-500 outline-none transition focus:border-emerald-400/50 focus:ring-1 focus:ring-emerald-400/20"
                />
                {emailError && (
                  <p className="text-xs text-red-400">{emailError}</p>
                )}
              </div>
              <Button
                type="submit"
                className="group relative h-11 w-full overflow-hidden rounded-lg bg-emerald-500 text-sm font-semibold text-black shadow-[0_0_0_1px_rgba(16,185,129,0.4),0_8px_32px_-8px_rgba(16,185,129,0.6)] transition hover:bg-emerald-400"
              >
                <span className="relative z-10 inline-flex items-center justify-center gap-2">
                  Continue{" "}
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </span>
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              </Button>
            </form>

            <div className="mt-5 text-center">
              <button
                type="button"
                onClick={handleForgotClick}
                disabled={loading}
                className="text-xs font-medium text-emerald-400 transition hover:text-emerald-300 disabled:opacity-50"
              >
                Forgot your MPIN?
              </button>
            </div>

            <div className="mt-10 flex items-center justify-between border-t border-white/5 pt-5">
              <p className="text-[11px] text-zinc-500">
                Protected by Scaninfoga security
              </p>
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Encrypted
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
         SIGNIN DIALOG (MPIN → Channel → OTP)
         ═══════════════════════════════════════════════════ */}
      <Dialog
        open={signinOpen}
        onOpenChange={(open) => {
          if (!loading) {
            setSigninOpen(open);
            if (!open) {
              setSigninStep("mpin");
              setSigninToken(null);
              setSigninMpinCode("");
            }
          }
        }}
      >
        <DialogContent
          className="border-white/10 bg-[#0A0E17] sm:max-w-[420px] sm:rounded-2xl"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader className="items-center text-center">
            <div className="mx-auto mb-4 flex items-center gap-2">
              <StepDot
                active={signinStepIdx === 0}
                done={signinStepIdx > 0}
                label="1"
              />
              <div
                className={`h-px w-6 transition-colors duration-300 ${signinStepIdx > 0 ? "bg-emerald-400" : "bg-white/10"}`}
              />
              <StepDot
                active={signinStepIdx === 1}
                done={signinStepIdx > 1}
                label="2"
              />
              <div
                className={`h-px w-6 transition-colors duration-300 ${signinStepIdx > 1 ? "bg-emerald-400" : "bg-white/10"}`}
              />
              <StepDot active={signinStepIdx === 2} done={false} label="3" />
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={signinStep}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col items-center gap-2"
              >
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-full ${
                    signinStep === "mpin"
                      ? "bg-emerald-500/10 text-emerald-400"
                      : signinStep === "channel"
                        ? "bg-violet-500/10 text-violet-400"
                        : "bg-cyan-500/10 text-cyan-400"
                  }`}
                >
                  {signinStep === "mpin" ? (
                    <Lock className="h-5 w-5" />
                  ) : signinStep === "channel" ? (
                    <ShieldCheck className="h-5 w-5" />
                  ) : (
                    <KeyRound className="h-5 w-5" />
                  )}
                </div>
                <DialogTitle className="text-lg font-semibold text-white">
                  {signinStep === "mpin"
                    ? "Enter your MPIN"
                    : signinStep === "channel"
                      ? "Choose verification"
                      : "Enter OTP"}
                </DialogTitle>
                <DialogDescription className="text-sm text-zinc-400">
                  {signinStep === "mpin"
                    ? "Enter your 6-digit MPIN to authenticate."
                    : signinStep === "channel"
                      ? "How would you like to receive your OTP?"
                      : `We sent a code to your ${signinOtpDest}. Enter it below.`}
                </DialogDescription>
              </motion.div>
            </AnimatePresence>
          </DialogHeader>

          <AnimatePresence mode="wait">
            <motion.div
              key={signinStep}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className="mt-2"
            >
              {signinStep === "mpin" && (
                <PinInput
                  digits={mpin}
                  onChange={(i, v) =>
                    pinDigitChange(
                      i,
                      v,
                      mpin,
                      setMpin,
                      mpinRefs,
                      handleMpinComplete,
                    )
                  }
                  onKeyDown={(i, e) => pinKeyDown(i, e, mpin, mpinRefs)}
                  onPaste={(e) =>
                    pinPaste(e, setMpin, mpinRefs, handleMpinComplete)
                  }
                  refs={mpinRefs}
                  loading={loading}
                  masked
                  accentColor="emerald"
                />
              )}
              {signinStep === "channel" && (
                <ChannelPicker
                  onSelect={handleSigninChannelSelect}
                  loading={loading}
                />
              )}
              {signinStep === "otp" && (
                <PinInput
                  digits={otp}
                  onChange={(i, v) =>
                    pinDigitChange(
                      i,
                      v,
                      otp,
                      setOtp,
                      otpRefs,
                      handleOtpComplete,
                    )
                  }
                  onKeyDown={(i, e) => pinKeyDown(i, e, otp, otpRefs)}
                  onPaste={(e) =>
                    pinPaste(e, setOtp, otpRefs, handleOtpComplete)
                  }
                  refs={otpRefs}
                  loading={loading}
                  masked={false}
                  accentColor="cyan"
                />
              )}
            </motion.div>
          </AnimatePresence>

          {loading && (
            <div className="flex items-center justify-center gap-2 pt-1 text-sm text-zinc-400">
              <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
              {signinStep === "mpin"
                ? "Authenticating..."
                : signinStep === "channel"
                  ? "Sending OTP..."
                  : "Verifying..."}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════
         FORGOT MPIN DIALOG (Channel → OTP → New MPIN)
         ═══════════════════════════════════════════════════ */}
      <Dialog
        open={forgotOpen}
        onOpenChange={(open) => {
          if (!loading) {
            setForgotOpen(open);
            if (!open) {
              setForgotStep("channel");
              setForgotToken(null);
            }
          }
        }}
      >
        <DialogContent
          className="border-white/10 bg-[#0A0E17] sm:max-w-[420px] sm:rounded-2xl"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader className="items-center text-center">
            <div className="mx-auto mb-4 flex items-center gap-2">
              <StepDot
                active={forgotStepIdx === 0}
                done={forgotStepIdx > 0}
                label="1"
              />
              <div
                className={`h-px w-6 transition-colors duration-300 ${forgotStepIdx > 0 ? "bg-amber-400" : "bg-white/10"}`}
              />
              <StepDot
                active={forgotStepIdx === 1}
                done={forgotStepIdx > 1}
                label="2"
              />
              <div
                className={`h-px w-6 transition-colors duration-300 ${forgotStepIdx > 1 ? "bg-amber-400" : "bg-white/10"}`}
              />
              <StepDot active={forgotStepIdx === 2} done={false} label="3" />
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={forgotStep}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col items-center gap-2"
              >
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-full ${
                    forgotStep === "channel"
                      ? "bg-violet-500/10 text-violet-400"
                      : forgotStep === "otp"
                        ? "bg-green-500/10 text-green-400"
                        : "bg-amber-500/10 text-amber-400"
                  }`}
                >
                  {forgotStep === "channel" ? (
                    <ShieldCheck className="h-5 w-5" />
                  ) : forgotStep === "otp" ? (
                    <Smartphone className="h-5 w-5" />
                  ) : (
                    <RotateCcw className="h-5 w-5" />
                  )}
                </div>
                <DialogTitle className="text-lg font-semibold text-white">
                  {forgotStep === "channel"
                    ? "Choose verification"
                    : forgotStep === "otp"
                      ? "Enter OTP"
                      : "Set new MPIN"}
                </DialogTitle>
                <DialogDescription className="text-sm text-zinc-400">
                  {forgotStep === "channel"
                    ? "How would you like to receive your reset OTP?"
                    : forgotStep === "otp"
                      ? `We sent a code to your ${forgotOtpDest}. Enter it below.`
                      : "Choose a new 6-digit MPIN for your account."}
                </DialogDescription>
              </motion.div>
            </AnimatePresence>
          </DialogHeader>

          <AnimatePresence mode="wait">
            <motion.div
              key={forgotStep}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className="mt-2"
            >
              {forgotStep === "channel" && (
                <ChannelPicker
                  onSelect={handleForgotChannelSelect}
                  loading={loading}
                />
              )}
              {forgotStep === "otp" && (
                <PinInput
                  digits={forgotOtp}
                  onChange={(i, v) =>
                    pinDigitChange(
                      i,
                      v,
                      forgotOtp,
                      setForgotOtp,
                      forgotOtpRefs,
                      handleForgotOtpComplete,
                    )
                  }
                  onKeyDown={(i, e) =>
                    pinKeyDown(i, e, forgotOtp, forgotOtpRefs)
                  }
                  onPaste={(e) =>
                    pinPaste(
                      e,
                      setForgotOtp,
                      forgotOtpRefs,
                      handleForgotOtpComplete,
                    )
                  }
                  refs={forgotOtpRefs}
                  loading={loading}
                  masked={false}
                  accentColor="green"
                />
              )}
              {forgotStep === "new-mpin" && (
                <PinInput
                  digits={newMpin}
                  onChange={(i, v) =>
                    pinDigitChange(
                      i,
                      v,
                      newMpin,
                      setNewMpin,
                      newMpinRefs,
                      handleNewMpinComplete,
                    )
                  }
                  onKeyDown={(i, e) => pinKeyDown(i, e, newMpin, newMpinRefs)}
                  onPaste={(e) =>
                    pinPaste(e, setNewMpin, newMpinRefs, handleNewMpinComplete)
                  }
                  refs={newMpinRefs}
                  loading={loading}
                  masked
                  accentColor="amber"
                />
              )}
            </motion.div>
          </AnimatePresence>

          {loading && (
            <div className="flex items-center justify-center gap-2 pt-1 text-sm text-zinc-400">
              <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
              {forgotStep === "channel"
                ? "Sending OTP..."
                : forgotStep === "new-mpin"
                  ? "Resetting MPIN..."
                  : "Verifying..."}
            </div>
          )}

          {forgotStep === "new-mpin" && !loading && (
            <button
              type="button"
              onClick={() => {
                setForgotStep("otp");
                setForgotOtp(Array(6).fill(""));
              }}
              className="mx-auto mt-1 block text-xs text-zinc-500 transition hover:text-zinc-300"
            >
              Re-enter OTP
            </button>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

/* ═══════════════════════════════════════════════════════════
   SHARED COMPONENTS
   ═══════════════════════════════════════════════════════════ */

/* ─── Channel Picker ─── */
function ChannelPicker({
  onSelect,
  loading,
}: {
  onSelect: (channel: OtpChannel) => void;
  loading: boolean;
}) {
  const [focused, setFocused] = useState<0 | 1>(0);
  const channels: {
    key: OtpChannel;
    label: string;
    desc: string;
    icon: React.ReactNode;
    borderHover: string;
    bgHover: string;
    iconBg: string;
    iconBgHover: string;
  }[] = [
    {
      key: "EMAIL",
      label: "Email",
      desc: "Receive OTP on your registered email",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
          <path
            d="M2 6a2 2 0 0 1 2-4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="0"
          />
          <rect
            x="2"
            y="4"
            width="20"
            height="16"
            rx="2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M2 6l10 7 10-7"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      ),
      borderHover: "border-red-400/40",
      bgHover: "bg-red-500/[0.05]",
      iconBg: "bg-red-500/10 text-red-400",
      iconBgHover: "group-hover:bg-red-500/20",
    },
    {
      key: "WHATSAPP",
      label: "WhatsApp",
      desc: "Receive OTP on your WhatsApp number",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347ZM12.05 21.785h-.01a9.856 9.856 0 0 1-5.023-1.378l-.36-.214-3.742.982.999-3.648-.235-.374A9.86 9.86 0 0 1 2.16 12.05C2.16 6.596 6.596 2.16 12.05 2.16c2.653 0 5.145 1.034 7.019 2.91a9.86 9.86 0 0 1 2.89 7.033c-.003 5.454-4.44 9.89-9.91 9.89v-.008ZM20.52 3.449A11.98 11.98 0 0 0 12.05.16C5.495.16.16 5.494.16 12.05a11.87 11.87 0 0 0 1.587 5.945L0 24l6.166-1.617A11.94 11.94 0 0 0 12.04 24h.01c6.555 0 11.89-5.335 11.893-11.893a11.82 11.82 0 0 0-3.48-8.413l.056-.245Z" />
        </svg>
      ),
      borderHover: "border-green-400/40",
      bgHover: "bg-green-500/[0.05]",
      iconBg: "bg-green-500/10 text-green-400",
      iconBgHover: "group-hover:bg-green-500/20",
    },
  ];

  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      if (loading) return;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setFocused((prev) => (prev === 0 ? 1 : 0));
      }
      if (e.key === "Enter") {
        e.preventDefault();
        onSelect(channels[focused]!.key);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [focused, loading, onSelect]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col gap-3 px-2">
      {channels.map((ch, idx) => {
        const isActive = focused === idx;
        return (
          <button
            key={ch.key}
            type="button"
            disabled={loading}
            onClick={() => onSelect(ch.key)}
            onMouseEnter={() => setFocused(idx as 0 | 1)}
            className={`group flex items-center gap-4 rounded-xl border p-4 text-left transition-all duration-150 disabled:opacity-50 ${
              isActive
                ? `${ch.borderHover} ${ch.bgHover} ring-1 ring-white/5`
                : "border-white/10 bg-white/[0.02]"
            }`}
          >
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition ${ch.iconBg} ${ch.iconBgHover}`}
            >
              {ch.icon}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">{ch.label}</p>
              <p className="text-[11px] text-zinc-500">{ch.desc}</p>
            </div>
            {isActive && (
              <div className="flex h-5 items-center rounded border border-white/10 bg-white/[0.05] px-1.5 text-[9px] font-medium text-zinc-500">
                ENTER
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ─── Pin Input ─── */
function PinInput({
  digits,
  onChange,
  onKeyDown,
  onPaste,
  refs,
  loading,
  masked,
  accentColor,
}: {
  digits: string[];
  onChange: (index: number, value: string) => void;
  onKeyDown: (index: number, e: KeyboardEvent<HTMLInputElement>) => void;
  onPaste: (e: React.ClipboardEvent) => void;
  refs: React.MutableRefObject<(HTMLInputElement | null)[]>;
  loading: boolean;
  masked: boolean;
  accentColor: "emerald" | "cyan" | "green" | "amber";
}) {
  useEffect(() => {
    const timer = setTimeout(() => refs.current[0]?.focus(), 50);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filled = digits.every((d) => d !== "");
  const colorMap = {
    emerald: {
      ring: "focus:border-emerald-400/60 focus:ring-emerald-400/20 focus:shadow-[0_0_12px_-2px_rgba(16,185,129,0.3)]",
      filled: "border-emerald-500/30 bg-emerald-500/[0.06]",
    },
    cyan: {
      ring: "focus:border-cyan-400/60 focus:ring-cyan-400/20 focus:shadow-[0_0_12px_-2px_rgba(6,182,212,0.3)]",
      filled: "border-cyan-500/30 bg-cyan-500/[0.06]",
    },
    green: {
      ring: "focus:border-green-400/60 focus:ring-green-400/20 focus:shadow-[0_0_12px_-2px_rgba(34,197,94,0.3)]",
      filled: "border-green-500/30 bg-green-500/[0.06]",
    },
    amber: {
      ring: "focus:border-amber-400/60 focus:ring-amber-400/20 focus:shadow-[0_0_12px_-2px_rgba(245,158,11,0.3)]",
      filled: "border-amber-500/30 bg-amber-500/[0.06]",
    },
  };
  const colors = colorMap[accentColor];

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center justify-center gap-2.5">
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type={masked ? "password" : "text"}
            inputMode="numeric"
            value={digit}
            disabled={loading}
            onChange={(e) => {
              onChange(i, e.target.value.replace(/\D/g, ""));
            }}
            onKeyDown={(e) => onKeyDown(i, e)}
            onPaste={onPaste}
            className={`h-14 w-12 rounded-xl border border-white/10 bg-white/[0.04] text-center text-xl font-semibold text-white outline-none transition-all duration-200 ${colors.ring} focus:ring-1 disabled:opacity-40 ${digit ? colors.filled : ""}`}
          />
        ))}
      </div>
      {filled && !loading && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-1.5 text-xs text-emerald-400"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          Submitting...
        </motion.div>
      )}
    </div>
  );
}

/* ─── Step Dot ─── */
function StepDot({
  active,
  done,
  label,
}: {
  active: boolean;
  done: boolean;
  label: string;
}) {
  return (
    <div
      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${
        done
          ? "bg-emerald-500 text-black"
          : active
            ? "border border-emerald-400/50 bg-emerald-500/15 text-emerald-400 shadow-[0_0_12px_-2px_rgba(16,185,129,0.4)]"
            : "border border-white/10 bg-white/[0.03] text-zinc-600"
      }`}
    >
      {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : label}
    </div>
  );
}

export default Login;
