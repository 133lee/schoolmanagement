"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  GraduationCap,
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { getRoleRoute } from "@/lib/auth/role-routes";
import { Role } from "@/types/prisma-enums";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || "Login failed. Please try again.");
        toast.error(data.error || "Login failed");
        return;
      }

      // Store token in localStorage
      if (data.data.token) {
        localStorage.setItem("auth_token", data.data.token);
        localStorage.setItem("user", JSON.stringify(data.data.user));
      }

      // Show success message
      toast.success("Login successful! Redirecting...");

      // Redirect to role-specific dashboard
      const roleRoute = getRoleRoute(data.data.user.role as Role);
      setTimeout(() => {
        router.push(roleRoute);
      }, 500);
    } catch (error) {
      console.error("Login error:", error);
      setError("An unexpected error occurred. Please try again.");
      toast.error("Connection error. Please check your internet connection.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        {/* <div className="flex flex-col items-center mb-8 space-y-3">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/20">
            <GraduationCap className="w-9 h-9 text-primary" />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              School Management
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Zambian Education System
            </p>
          </div>
        </div> */}

        {/* Login Card */}
        <Card className="border-border/60 shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-semibold">
              Welcome Back
            </CardTitle>
            <CardDescription>
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="teacher@school.zm"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href="/forgot-password"
                    className="text-xs text-primary hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}>
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isLoading}>
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Signing in...
                  </div>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <div className="relative w-full">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  Need Help?
                </span>
              </div>
            </div>
            <p className="text-center text-sm text-muted-foreground">
              Contact your school administrator for account access
            </p>
          </CardFooter>
        </Card>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} School Management System. Monarch Devs,
            Zambia.
          </p>
        </div>
      </div>
    </div>
  );
}
