import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { api } from "@sdk/api";
import { toast } from "@/hooks/use-toast";
const logo = "/techiemaya-logo.png";

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [lastResponse, setLastResponse] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      navigate("/");
      return;
    }

    // Check if there's a magic link token in URL
    const magicToken = searchParams.get('token');
    if (magicToken) {
      verifyMagicLink(magicToken);
    }
  }, [navigate, searchParams]);

  const verifyMagicLink = async (token: string) => {
    setLoading(true);
    try {
      const response = await api.auth.verifyMagicLink(token) as any;

      // Save token and user data
      localStorage.setItem('auth_token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));

      toast({
        title: "Success",
        description: "Login successful! Welcome back.",
      });

      navigate("/");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Invalid or expired magic link",
        variant: "destructive",
      });
      // Clear the token from URL on error
      navigate("/auth", { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.auth.sendMagicLink(email.trim().toLowerCase()) as any;

      console.log('🔍 Magic link response:', response);
      setLastResponse(response);

      setMagicLinkSent(true);



      if (response.emailSent) {
        toast({
          title: "Magic Link Sent! ✉️",
          description: "Check your email inbox for the secure login link. It expires in 15 minutes.",
        });
      } else {
        // Fallback for development when email service is not configured
        toast({
          title: "Magic Link Generated! 🔗",
          description: response.note || "Magic link generated successfully.",
        });
      }

    } catch (error: any) {
      let errorMessage = error.message || "Failed to send magic link";

      // Provide helpful message for connection errors
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('ERR_CONNECTION_REFUSED') || errorMessage.includes('Cannot connect to server')) {
        errorMessage = "Backend server is not running. Please start the backend server first. See README.md for instructions.";
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
        duration: 10000,
      });
    } finally {
      setLoading(false);
    }
  };


  // If verifying magic link, show loading state
  if (searchParams.get('token')) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-1">
              <img src={logo} alt="TechieMaya Logo" className="h-52 w-auto" />
            </div>
            <CardTitle className="text-2xl">Verifying Magic Link</CardTitle>
            <CardDescription>Please wait while we log you in...</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="flex justify-center items-center space-x-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <span>Logging in...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-1">
            <img src={logo} alt="TechieMaya Logo" className="h-52 w-auto" />
          </div>
          <CardTitle className="text-2xl">Welcome to Pulse</CardTitle>
          <CardDescription>
            {magicLinkSent
              ? "We've sent you a magic link!"
              : "Enter your email to receive a secure login link"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {magicLinkSent ? (
            <div className="space-y-4">
              {/* Show email sent message if email was sent */}
              {lastResponse?.emailSent && (
                <div className="text-center mb-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                    <div className="text-6xl mb-4">📧</div>
                    <h3 className="text-lg font-semibold text-green-800 mb-2">
                      Magic Link Sent!
                    </h3>
                    <p className="text-sm text-green-700">
                      We've sent a secure login link to <strong>{email}</strong>
                    </p>
                    <p className="text-xs text-green-600 mt-2">
                      ⏰ The link expires in 15 minutes for security
                    </p>
                  </div>
                  <div className="space-y-2 text-sm text-muted-foreground mt-4">
                    <p>📬 Check your email inbox for the login link</p>
                    <p>🔍 Don't see it? Check your spam/junk folder</p>
                    <p>📱 The link works on mobile and desktop</p>
                  </div>
                </div>
              )}




              <div className="text-center mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setMagicLinkSent(false);
                    setEmail("");
                    setLastResponse(null);
                  }}
                  className="text-primary hover:underline text-sm"
                >
                  <span role="img" aria-label="email" className="mr-1">📧</span> Send to different email
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSendMagicLink} className="space-y-4">
              <div>
                <Input
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Sending Magic Link...</span>
                  </div>
                ) : (
                  "🔗 Send Magic Link"
                )}
              </Button>
              <div className="text-center text-sm text-muted-foreground">
                <p>
                  No account needed! Just enter your registered email address and we'll send you a secure login link.
                </p>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;

