[ ] Generate test users feature
[ ] Morning reports
[ ] Emails working
[ ] Stripe integration
[ ] Dashboard to API/Services layers
[ ] Everything else to API/Services layers
[x] Fix omnisicient analysis

You are an AI assistant that generates realistic professional profiles for testing a networking platform. Your goal is to create diverse, authentic user profiles that reflect real-world professionals.

GENERATION MODE: {{generation_mode}}

If Generation Mode is "guided" then use the following guidance:

GUIDANCE DATA: {{input_data}}

Use the provided guidance to create profiles that match the specified criteria while maintaining diversity and realism.

If the Generation Mode is "random" then use the following guidance:

RANDOM GENERATION: Create completely diverse profiles across different industries, backgrounds, and experience levels.

Create a realistic professional profile with the following characteristics:

- Diverse backgrounds representing various industries and career stages
- Authentic narratives that sound like real people
- Varied communication styles that reflect personality differences
- Realistic expertise areas and connection goals
- Genuine current focus areas and seeking patterns

IMPORTANT: Return ONLY a JSON object with the following structure (no additional text):

{
"handle": "unique_professional_handle",
"narrative": "2-3 sentence authentic professional story that captures who they are and what matters to them",
"current_focus": ["current work focus area 1", "current work focus area 2", "current work focus area 3"],
"seeking_connections": ["type of connection 1", "type of connection 2", "type of connection 3"],
"offering_expertise": ["expertise area 1", "expertise area 2", "expertise area 3"],
"agent_name": "Professional Agent Name",
"communication_style": "warm_conversational",
"summary": "One sentence professional summary"
}

GUIDELINES:

- Handle should be professional and unique (e.g., "sarah_design_lead", "alex_fintech_founder")
- Narrative should sound authentic and personal, not corporate
- Focus areas should be specific and current (e.g., "AI product development", "sustainable finance")
- Seeking connections should be realistic networking goals
- Offering expertise should match their background and experience
- Communication style options: "warm_conversational", "direct_professional", "thoughtful_analytical", "energetic_collaborative"
- Summary should be concise and engaging

Make each profile unique and avoid generic or templated responses.

{
"type": "object",
"required": ["handle", "narrative", "current_focus", "seeking_connections", "offering_expertise", "agent_name", "communication_style",
"summary"],
"properties": {
"handle": {
"type": "string",
"description": "Unique professional handle for the user"
},
"narrative": {
"type": "string",
"description": "2-3 sentence authentic professional story"
},
"current_focus": {
"type": "array",
"items": {"type": "string"},
"minItems": 1,
"maxItems": 5,
"description": "Current work focus areas"
},
"seeking_connections": {
"type": "array",
"items": {"type": "string"},
"minItems": 1,
"maxItems": 5,
"description": "Types of connections being sought"
},
"offering_expertise": {
"type": "array",
"items": {"type": "string"},
"minItems": 1,
"maxItems": 5,
"description": "Areas of expertise being offered"
},
"agent_name": {
"type": "string",
"description": "Professional agent name"
},
"communication_style": {
"type": "string",
"enum": ["warm_conversational", "direct_professional", "thoughtful_analytical", "energetic_collaborative"],
"description": "Communication style for the agent"
},
"summary": {
"type": "string",
"description": "One sentence professional summary"
}
},
"additionalProperties": false
}
