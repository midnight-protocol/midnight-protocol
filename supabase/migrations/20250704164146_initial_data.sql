--
-- Data for Name: prompt_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."prompt_templates" ("id", "name", "description", "template_text", "variables", "prompt_type", "version", "is_active", "created_by", "created_at", "updated_at", "metadata") VALUES
	('7c8bc9a4-7521-4043-af9c-5829e3cb924d', 'agent_conversation_default', 'Default prompt for agent-to-agent conversations', 'You are {{agentName}}, representing @{{handle}}. Your human''s professional essence:
- Current Focus: {{current_focus}}
- Seeking Connections: {{seeking_connections}}
- Offering Expertise: {{offering_expertise}}
- Context: {{narrative}}

You''re having a conversation with another agent. This is turn {{turnNumber}} of 6 total turns.

Guidelines:
- Be authentic to your human''s professional identity
- Ask thoughtful questions to understand the other agent''s human
- Share relevant experiences and insights
- Look for potential synergies and collaboration opportunities
- Keep responses concise (2-3 paragraphs max)

Please respond naturally as {{agentName}}:', '["agentName", "handle", "current_focus", "seeking_connections", "offering_expertise", "narrative", "turnNumber"]', 'agent_conversation', 1, true, NULL, '2025-06-17 02:31:50.455945+00', '2025-06-17 02:31:50.455945+00', '{}');
--
-- Data for Name: system_config; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."system_config" ("id", "category", "config_key", "config_value", "description", "updated_by", "updated_at") VALUES
	('ab2230c0-5ded-4efd-809b-1742e0584584', 'networking', 'batch_enabled', 'true', 'Enable nightly batch processing', NULL, '2025-06-11 03:59:54.48297+00'),
	('820adb57-8940-4acc-aa94-67feafb07767', 'email', 'morning_reports_enabled', 'true', 'Enable morning report emails', NULL, '2025-06-11 03:59:54.48297+00'),
	('341fadc7-26b6-4d85-8d86-94f1b56b70a4', 'limits', 'daily_introductions', '3', 'Maximum introductions per user per day', NULL, '2025-06-11 03:59:54.48297+00'),
	('1e06c103-b56f-4e36-a8f6-cea01f820e5d', 'ai', 'ai_model_onboarding', '"anthropic/claude-sonnet-4"', 'AI model for onboarding conversations', NULL, '2025-06-11 05:54:13.012765+00'),
	('1d7282f9-2752-408a-9bd4-3d5ec064f79e', 'ai', 'ai_model_conversation', '"anthropic/claude-sonnet-4"', 'AI model for agent conversations', NULL, '2025-06-11 05:54:13.012765+00'),
	('bcfac56a-acf6-4c14-b351-dda5ef09c7b2', 'ai', 'ai_model_reporting', '"anthropic/claude-opus-4"', 'AI model for report generation', NULL, '2025-06-11 05:54:13.012765+00'),
	('3df27782-645a-473c-9657-c3be1a842381', 'matching', 'conversations_per_user_per_day', '3', 'Daily conversation limit per user', NULL, '2025-06-20 18:48:58.308726+00'),
	('6af5de8c-3739-4ce1-be4f-92c686d61942', 'matching', 'matching_batch_size', '200', 'Maximum users per LLM matching batch', NULL, '2025-06-20 18:48:58.308726+00');
