-- Remove duplicate onboarding_conversations entries, keeping only the latest for each user
DELETE FROM onboarding_conversations
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id) id
  FROM onboarding_conversations
  ORDER BY user_id, updated_at DESC
);

-- Add unique constraint to prevent future duplicates
ALTER TABLE onboarding_conversations 
ADD CONSTRAINT onboarding_conversations_user_id_unique UNIQUE (user_id);