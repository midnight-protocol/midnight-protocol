import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TestProfile, testProfiles } from "@/data/e2e-test-profiles";
import { User, Briefcase, Target } from "lucide-react";

interface TestProfileSelectorProps {
  selectedProfile?: TestProfile;
  onSelectProfile: (profile: TestProfile) => void;
}

export const TestProfileSelector = ({ selectedProfile, onSelectProfile }: TestProfileSelectorProps) => {
  return (
    <Card className="border-terminal-green/30 bg-terminal-bg/50">
      <CardHeader>
        <CardTitle className="text-terminal-green">Test Profile Selection</CardTitle>
        <CardDescription className="text-terminal-text-muted">
          Choose a pre-configured test profile or use custom values
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {testProfiles.journeyUsers.map((profile, index) => (
          <div
            key={index}
            className={`p-3 rounded-lg border cursor-pointer transition-all ${
              selectedProfile === profile
                ? "border-terminal-green bg-terminal-green/10"
                : "border-terminal-green/20 hover:border-terminal-green/40 hover:bg-terminal-bg/30"
            }`}
            onClick={() => onSelectProfile(profile)}
          >
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-terminal-cyan" />
                  <span className="font-mono text-sm text-terminal-cyan">
                    {profile.name}
                  </span>
                </div>
                
                <div className="text-xs text-terminal-text-muted space-y-1">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-3 h-3" />
                    <span>{profile.persona.expertise.slice(0, 2).join(", ")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="w-3 h-3" />
                    <span>{profile.persona.goals[0]}</span>
                  </div>
                </div>

                <div className="flex gap-2 mt-2">
                  <span className="text-xs px-2 py-0.5 bg-terminal-purple/20 text-terminal-purple rounded">
                    {profile.agent.communicationStyle}
                  </span>
                  <span className="text-xs px-2 py-0.5 bg-terminal-cyan/20 text-terminal-cyan rounded">
                    {profile.onboarding.messages.length} messages
                  </span>
                </div>
              </div>

              {selectedProfile === profile && (
                <div className="ml-3">
                  <div className="w-2 h-2 bg-terminal-green rounded-full animate-pulse" />
                </div>
              )}
            </div>
          </div>
        ))}

        <div className="pt-2 border-t border-terminal-green/20">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSelectProfile(undefined as any)}
            className="w-full border-terminal-text-muted text-terminal-text-muted"
          >
            Clear Selection (Use Custom Values)
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};