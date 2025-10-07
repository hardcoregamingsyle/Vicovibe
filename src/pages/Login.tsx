import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, Mail, Lock } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { FaGoogle, FaGithub } from "react-icons/fa";

interface LoginProps {
  redirectAfterAuth?: string;
}

function Login({ redirectAfterAuth }: LoginProps = {}) {
  const { isLoading: authLoading, isAuthenticated, signIn } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      const redirect = redirectAfterAuth || "/projects";
      navigate(redirect);
    }
  }, [authLoading, isAuthenticated, navigate, redirectAfterAuth]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      formData.append("flow", "signIn");
      await signIn("password", formData);
      const redirect = redirectAfterAuth || "/projects";
      navigate(redirect);
    } catch (error) {
      console.error("Login error:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to sign in. Please check your credentials.",
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col dark bg-background">
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <img
                src="/logo.svg"
                alt="Logo"
                width={64}
                height={64}
                className="rounded-lg cursor-pointer"
                onClick={() => navigate("/")}
              />
            </div>
            <CardTitle className="text-2xl">Welcome Back</CardTitle>
            <CardDescription>Sign in to your account</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    placeholder="name@example.com"
                    type="email"
                    className="pl-9"
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    placeholder="••••••••"
                    type="password"
                    className="pl-9"
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>
              {error && (
                <p className="text-sm text-red-500 text-center">{error}</p>
              )}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => signIn("google")}
                  disabled={isLoading}
                >
                  <FaGoogle className="mr-2 h-4 w-4" />
                  Google
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => signIn("github")}
                  disabled={isLoading}
                >
                  <FaGithub className="mr-2 h-4 w-4" />
                  GitHub
                </Button>
              </div>
            </CardContent>
          </form>
          <CardFooter className="flex-col gap-2">
            <p className="text-sm text-muted-foreground text-center">
              Don't have an account?{" "}
              <Button
                variant="link"
                className="p-0 h-auto"
                onClick={() => navigate("/signup")}
              >
                Sign up
              </Button>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage(props: LoginProps) {
  return (
    <Suspense>
      <Login {...props} />
    </Suspense>
  );
}