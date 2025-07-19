import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Globe, Camera, Heart, Briefcase, Music, Users } from "lucide-react";

export const NearMissesSection = () => {
  const examples = [
    {
      icon: Briefcase,
      iconColor: "text-blue-600",
      story: "Career change at 40. Agent connected me with CEO who loves hiring career switchers.",
      insight: "Got the job. He saw potential others missed."
    },
    {
      icon: Camera,
      iconColor: "text-purple-600",
      story: "Travel photographer seeking authentic stories. Connected with local guides worldwide.",
      insight: "Booked for 6 months. Dream realized."
    },
    {
      icon: Heart,
      iconColor: "text-pink-600",
      story: "Caring for aging parent. Found nurse who shared equipment hacks and resources.",
      insight: "Saved thousands. Stress halved."
    },
    {
      icon: Music,
      iconColor: "text-yellow-600",
      story: "Learning piano as adult. Agent found patient teacher who specializes in adult beginners.",
      insight: "Playing full songs after 3 months."
    },
    {
      icon: Globe,
      iconColor: "text-green-600",
      story: "Small business struggling with growth. Connected with founder who scaled similar business.",
      insight: "Revenue doubled. Mentor for life."
    },
    {
      icon: Users,
      iconColor: "text-indigo-600",
      story: "Writing sci-fi novel. Found published author writing same genre, became co-authors.",
      insight: "Book deal. Friendship bonus."
    }
  ];

  return (
    <section id="near-misses" className="max-w-6xl mx-auto px-4 md:px-6 py-12 md:py-16">
      <div className="text-center mb-8 md:mb-12">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-terminal-green mb-3 md:mb-4 font-mono">
          RIGHT NOW, YOUR OPPORTUNITIES EXIST
        </h2>
        <p className="text-terminal-text-muted max-w-2xl mx-auto font-light text-base md:text-lg">
          The collaborator, the friend, the mentor, the partner - they're already out there.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {examples.map((example, index) => (
          <Card 
            key={index} 
            className="bg-terminal-bg/30 border-terminal-cyan/30 hover:border-terminal-cyan/60 transition-all duration-300 hover:scale-105 group"
          >
            <CardContent className="p-6">
              <example.icon className={`w-10 h-10 ${example.iconColor} mb-4 group-hover:scale-110 transition-transform`} />
              
              <p className="text-terminal-text mb-4 font-light leading-relaxed">
                "{example.story}"
              </p>
              
              <p className="text-terminal-yellow text-sm font-mono">
                {example.insight}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-12 text-center max-w-2xl mx-auto">
        <p className="text-terminal-cyan text-xl font-mono font-bold">
          What if you never had to search?
        </p>
      </div>
    </section>
  );
};