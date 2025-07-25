# Implementation Plan

- [ ] 1. Enhance database schema for richer personal story data
  - Add new columns to personal_stories table: desired_outcomes, personal_essence, deep_context
  - Create database migration file with proper column types and defaults
  - Test migration on local development database
  - _Requirements: 1.1, 2.1, 3.1_

- [ ] 2. Update TypeScript interfaces for enhanced personal story model
  - Modify existing PersonalStory interface to include new fields (desired_outcomes, personal_essence, deep_context)
  - Update API service interfaces to handle enhanced response format
  - Add type definitions for personal_essence structure (values, thinking_patterns, energy_sources, unique_perspective)
  - _Requirements: 1.1, 2.1, 3.1_

- [ ] 3. Enhance AI prompt template for structured story generation
  - Modify existing agent_interview_onboarding_v2 prompt to request enhanced JSON structure
  - Update prompt to focus on holistic understanding (who they are) and desired outcomes (what they want to create)
  - Add instructions for generating deep_context field for AI matching purposes
  - Test prompt template with sample conversations to ensure consistent JSON output
  - _Requirements: 1.1, 2.1, 2.2, 3.1_

- [ ] 4. Update backend JSON parsing logic for enhanced story data
  - Modify sendOnboardingMessage function in onboarding.ts to handle new JSON fields
  - Add validation for new fields (desired_outcomes array, personal_essence object structure)
  - Update database upsert logic to save new fields to personal_stories table
  - Add error handling for malformed JSON responses with graceful fallback
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 5. Enhance PersonalStoryDisplay component with new sections
  - Add DesiredOutcomesSection component to display user's desired outcomes as styled tags
  - Create PersonalEssenceSection component (collapsible) to show values, thinking patterns, etc.
  - Update existing component to handle new data fields gracefully
  - Add loading states and smooth transitions for real-time updates
  - _Requirements: 1.1, 4.1, 4.2_

- [ ] 6. Implement real-time story updates in OnboardingChat component
  - Modify sendMessage function to handle enhanced response format with both chat and story data
  - Add state management for real-time personal story updates
  - Implement optimistic UI updates with rollback on failure
  - Add visual indicators when story is being updated (subtle animation or indicator)
  - _Requirements: 4.1, 4.2, 4.3_

- [ ] 7. Add admin configuration for JSON response mode
  - Create system configuration option for enabling/disabling enhanced JSON mode
  - Add toggle in admin panel to switch between text-only and structured response modes
  - Implement configuration validation and error handling
  - Add monitoring to track JSON parsing success rates
  - _Requirements: 6.1, 6.2, 6.3_

- [ ] 8. Create comprehensive test suite for enhanced functionality
  - Write unit tests for JSON parsing logic with various response formats
  - Create integration tests for end-to-end story update flow
  - Add tests for error handling scenarios (malformed JSON, database failures)
  - Test real-time UI updates and synchronization between components
  - _Requirements: 3.3, 4.3, 5.1_

- [ ] 9. Implement error handling and fallback mechanisms
  - Add graceful degradation when JSON parsing fails (fall back to text-only mode)
  - Implement retry logic for failed story updates with exponential backoff
  - Add user-friendly error states without disrupting conversation flow
  - Create admin alerts for persistent parsing failures
  - _Requirements: 3.3, 5.1, 5.2_

- [ ] 10. Optimize performance and add monitoring
  - Add database indexing for new personal_stories columns
  - Implement caching for frequently accessed story data
  - Add performance monitoring for dual AI response processing
  - Create admin dashboard metrics for story completeness and update success rates
  - _Requirements: 2.3, 4.3, 6.1_