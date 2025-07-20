-- Add new columns to omniscient_matches table for enhanced match analysis
ALTER TABLE public.omniscient_matches 
ADD COLUMN should_notify boolean,
ADD COLUMN notification_score numeric(3,2),
ADD COLUMN notification_reasoning text,
ADD COLUMN introduction_rationale_for_user_a text,
ADD COLUMN introduction_rationale_for_user_b text,
ADD COLUMN agent_summaries_agent_a_to_human_a text,
ADD COLUMN agent_summaries_agent_b_to_human_b text;

-- Add constraint for notification_score to ensure it's between 0 and 1
ALTER TABLE public.omniscient_matches 
ADD CONSTRAINT omniscient_matches_notification_score_check 
CHECK ((notification_score >= 0.0) AND (notification_score <= 1.0));