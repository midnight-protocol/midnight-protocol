
  -- Add 'reported' status to omniscient_match_status enum
  -- This status indicates that a match has been included in a morning report

  ALTER TYPE omniscient_match_status ADD VALUE 'reported';

  -- The new status flow will be:
  -- pending_analysis → analyzed → reported (when included in morning report)
  -- OR
  -- pending_analysis → analyzed → scheduled → active → completed (for conversations)

  -- No additional indexes needed as the existing status index will cover the new value