-- Remove duplicate personal_stories entries, keeping only the latest for each user
DELETE FROM personal_stories
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id) id
  FROM personal_stories
  ORDER BY user_id, updated_at DESC
);

-- Add unique constraint to prevent future duplicates
ALTER TABLE personal_stories 
ADD CONSTRAINT personal_stories_user_id_unique UNIQUE (user_id);