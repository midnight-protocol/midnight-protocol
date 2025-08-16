export interface TestProfile {
  name: string;
  emailPrefix: string;
  handlePrefix: string;
  password: string;
  agent: {
    namePrefix: string;
    communicationStyle: string;
  };
  persona: {
    background: string;
    expertise: string[];
    goals: string[];
    challenges: string[];
    communication_style: string;
  };
  onboarding: {
    messages: string[];
  };
}

export interface TestProfiles {
  admin: {
    emailPrefix: string;
    password: string;
    role: string;
  };
  journeyUsers: TestProfile[];
}

export const testProfiles: TestProfiles = {
  admin: {
    emailPrefix: "e2e-test-admin",
    password: "TestAdmin123!",
    role: "admin"
  },
  journeyUsers: [
    {
      name: "Alex Chen - AI Researcher",
      emailPrefix: "e2e-test-alex",
      handlePrefix: "alexchen",
      password: "TestUser123!",
      agent: {
        namePrefix: "Nova",
        communicationStyle: "ANALYTICAL"
      },
      persona: {
        background: "PhD in Machine Learning from Stanford, 5 years at OpenAI working on reinforcement learning. Recently left to explore startup opportunities in AI safety and alignment.",
        expertise: [
          "Reinforcement learning algorithms",
          "AI safety research",
          "Large language model fine-tuning",
          "Neural architecture search"
        ],
        goals: [
          "Build AI systems that are provably safe and aligned with human values",
          "Find co-founders for an AI safety startup",
          "Develop open-source tools for AI interpretability"
        ],
        challenges: [
          "Bridging the gap between theoretical AI safety and practical implementation",
          "Finding funding for long-term AI safety research",
          "Building a team with both technical depth and product sense"
        ],
        communication_style: "Technical and precise, often uses analogies from mathematics and computer science"
      },
      onboarding: {
        messages: [
          "I'm Alex, recently left OpenAI to explore AI safety startups. I've been working on reinforcement learning for 5 years and I'm passionate about building AI that's aligned with human values.",
          "My main challenge is finding the right co-founders who understand both the technical depth of AI safety and can help build it into a viable product. I have some novel approaches to interpretability I'd love to develop.",
          "I'm particularly interested in connecting with people who have experience in either ML engineering, product management in AI, or have raised funding for deep tech startups.",
          "I spend most of my time researching new architectures for safe AI systems. I've published several papers on reward hacking prevention and I'm working on open-sourcing some interpretability tools.",
          "What really drives me is the potential to shape how AI develops over the next decade. I believe we're at a critical juncture and the decisions we make now about AI safety will have massive downstream effects.",
          "I'm based in San Francisco but open to remote collaboration. I typically work late nights when I'm in deep research mode. Looking forward to connecting with like-minded builders!"
        ]
      }
    },
    {
      name: "Maya Patel - Climate Tech Entrepreneur",
      emailPrefix: "e2e-test-maya",
      handlePrefix: "mayapatel",
      password: "TestUser123!",
      agent: {
        namePrefix: "Echo",
        communicationStyle: "ENTHUSIASTIC"
      },
      persona: {
        background: "Former Tesla engineer, founded and sold a solar analytics startup. Now angel investing and advising climate tech companies while exploring next venture.",
        expertise: [
          "Renewable energy systems",
          "Carbon capture technology",
          "Supply chain optimization",
          "B2B SaaS sales"
        ],
        goals: [
          "Launch a carbon removal marketplace",
          "Connect climate tech founders with investors",
          "Scale regenerative agriculture solutions"
        ],
        challenges: [
          "Navigating regulatory complexity in climate tech",
          "Finding technical co-founders with domain expertise",
          "Balancing impact goals with venture-scale returns"
        ],
        communication_style: "Energetic and optimistic, frequently references specific metrics and case studies"
      },
      onboarding: {
        messages: [
          "Hi! I'm Maya, a climate tech entrepreneur. I previously founded a solar analytics company that we sold to a larger energy firm. Now I'm exploring carbon removal marketplaces.",
          "After working at Tesla and running my own startup, I've seen both sides of climate tech - the massive potential and the execution challenges. I'm passionate about making real impact at scale.",
          "I'm looking to connect with technical founders in carbon capture, other climate investors, and anyone working on regenerative agriculture. I can offer fundraising advice and B2B sales expertise.",
          "My biggest challenge right now is finding the right technical co-founder who understands both the science and the business side of carbon removal. The regulatory landscape is also quite complex.",
          "I believe we have maybe 5-7 years to deploy climate solutions at massive scale. That's why I'm focused on marketplaces and platforms that can accelerate adoption rather than building single-point solutions.",
          "Based in Austin but I travel frequently to SF and NYC for investor meetings. Always happy to grab coffee and talk climate tech!"
        ]
      }
    },
    {
      name: "Jordan Kim - Game Designer",
      emailPrefix: "e2e-test-jordan",
      handlePrefix: "jordankim",
      password: "TestUser123!",
      agent: {
        namePrefix: "Pixel",
        communicationStyle: "CREATIVE"
      },
      persona: {
        background: "Led design on multiple AAA games at Blizzard, now independent developer exploring Web3 gaming and metaverse experiences.",
        expertise: [
          "Game mechanics and balancing",
          "Virtual economy design",
          "Player psychology and retention",
          "Unity and Unreal Engine"
        ],
        goals: [
          "Create a Web3 game that actually fun to play",
          "Build sustainable creator economies in virtual worlds",
          "Bridge traditional gaming with blockchain technology"
        ],
        challenges: [
          "Overcoming negative perception of Web3 gaming",
          "Finding blockchain developers who understand gaming",
          "Balancing decentralization with user experience"
        ],
        communication_style: "Creative and metaphorical, often references game mechanics and player experiences"
      },
      onboarding: {
        messages: [
          "Hey! I'm Jordan, game designer with 10 years in AAA gaming. I led design on several major titles at Blizzard before going indie to explore Web3 gaming.",
          "I'm fascinated by the potential of true digital ownership and player-driven economies, but frustrated by how poorly most blockchain games understand what makes games actually fun.",
          "Looking to connect with blockchain developers who get gaming, other game designers exploring Web3, and anyone thinking deeply about virtual economies and metaverse experiences.",
          "My current project is trying to solve the onboarding problem for Web3 games - how do we make blockchain invisible to players while still giving them the benefits of ownership?",
          "I think the future of gaming is in persistent worlds with real economies, but we need to nail the fun factor first. Too many Web3 games feel like spreadsheets with graphics.",
          "I'm in LA but spend a lot of time in Discord and virtual worlds. Always down to playtest ideas or talk game design!"
        ]
      }
    }
  ]
};

export const getRandomProfile = (): TestProfile => {
  const profiles = testProfiles.journeyUsers;
  return profiles[Math.floor(Math.random() * profiles.length)];
};

export const generateTestUserData = (profile: TestProfile, timestamp?: number) => {
  const ts = timestamp || Date.now();
  return {
    email: `${profile.emailPrefix}-${ts}@test.com`,
    password: profile.password,
    handle: `${profile.handlePrefix}-${ts}`,
    agentName: `${profile.agent.namePrefix}-${ts}`,
    communicationStyle: profile.agent.communicationStyle
  };
};