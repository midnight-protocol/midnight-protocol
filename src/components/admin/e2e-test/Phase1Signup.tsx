import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { e2eTestService, TestUser } from "@/services/e2e-test.service";
import { TestProfile, generateTestUserData } from "@/data/e2e-test-profiles";
import { toast } from "sonner";
import { UserPlus, CheckCircle, AlertCircle } from "lucide-react";

interface Phase1SignupProps {
  selectedProfile?: TestProfile;
  onUserCreated: (user: TestUser) => void;
}

export const Phase1Signup = ({ selectedProfile, onUserCreated }: Phase1SignupProps) => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [handle, setHandle] = useState("");
  const [createdUser, setCreatedUser] = useState<TestUser | null>(null);

  const fillFromProfile = () => {
    if (selectedProfile) {
      const data = generateTestUserData(selectedProfile);
      setEmail(data.email);
      setPassword(data.password);
      setHandle(data.handle);
    }
  };

  const handleCreateUser = async () => {
    if (!email || !password || !handle) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const result = await e2eTestService.createTestUser(email, password, handle);
      setCreatedUser(result.user);
      onUserCreated(result.user);
      toast.success("Test user created successfully");
    } catch (error) {
      toast.error(`Failed to create user: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-terminal-green/30 bg-terminal-bg/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-terminal-green">
          <UserPlus className="w-5 h-5" />
          Phase 1: User Signup & Authentication
        </CardTitle>
        <CardDescription className="text-terminal-text-muted">
          Create a test user with authentication credentials
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Input Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-terminal-cyan">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="test-user@example.com"
              className="font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-terminal-cyan">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="TestPassword123!"
              className="font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="handle" className="text-terminal-cyan">Handle</Label>
            <Input
              id="handle"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="testuser123"
              className="font-mono"
            />
          </div>

          <div className="flex items-end">
            <Button
              onClick={fillFromProfile}
              disabled={!selectedProfile}
              variant="outline"
              className="border-terminal-purple text-terminal-purple hover:bg-terminal-purple/10"
            >
              Fill from Profile
            </Button>
          </div>
        </div>

        {/* Create Button */}
        <div className="flex justify-between items-center pt-4">
          <Button
            onClick={handleCreateUser}
            disabled={loading || !email || !password || !handle}
            className="bg-terminal-green text-terminal-bg hover:bg-terminal-green/80"
          >
            {loading ? "Creating..." : "Create Test User"}
          </Button>

          {createdUser && (
            <div className="flex items-center gap-2 text-terminal-green">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">User created successfully</span>
            </div>
          )}
        </div>

        {/* Created User Details */}
        {createdUser && (
          <div className="mt-4 p-4 bg-terminal-bg rounded-lg border border-terminal-green/20">
            <h4 className="text-terminal-cyan font-mono text-sm mb-2">Created User Details:</h4>
            <div className="space-y-1 text-xs font-mono">
              <div className="flex gap-2">
                <span className="text-terminal-text-muted">Auth ID:</span>
                <span className="text-terminal-text">{createdUser.id}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-terminal-text-muted">Database ID:</span>
                <span className="text-terminal-text">{createdUser.databaseId}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-terminal-text-muted">Email:</span>
                <span className="text-terminal-text">{createdUser.email}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-terminal-text-muted">Handle:</span>
                <span className="text-terminal-text">{createdUser.handle}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-terminal-text-muted">Status:</span>
                <span className={`${
                  createdUser.status === "PENDING" ? "text-yellow-400" : 
                  createdUser.status === "APPROVED" ? "text-terminal-green" : 
                  "text-red-400"
                }`}>
                  {createdUser.status}
                </span>
              </div>
              {createdUser.authToken && (
                <div className="flex gap-2">
                  <span className="text-terminal-text-muted">Auth Token:</span>
                  <span className="text-terminal-text truncate max-w-[300px]">
                    {createdUser.authToken.substring(0, 20)}...
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-4 p-3 bg-terminal-bg/30 rounded-lg border border-terminal-cyan/20">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-terminal-cyan mt-0.5" />
            <div className="text-xs text-terminal-text-muted">
              <p>This will create a real user in the authentication system.</p>
              <p className="mt-1">All test users are prefixed with "e2e-test-" for easy identification.</p>
              <p className="mt-1">Use the cleanup function to remove test data when done.</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};