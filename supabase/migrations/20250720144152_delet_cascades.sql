-- Fix omniscient_conversations to cascade when matches are deleted                                                                             
ALTER TABLE omniscient_conversations                                                                                                            
DROP CONSTRAINT omniscient_conversations_match_id_fkey,                                                                                         
ADD CONSTRAINT omniscient_conversations_match_id_fkey                                                                                           
  FOREIGN KEY (match_id) REFERENCES omniscient_matches(id) ON DELETE CASCADE;                                                                   
                                                                                                                                                
-- Fix omniscient_outcomes to cascade when matches are deleted                                                                                  
ALTER TABLE omniscient_outcomes                                                                                                                 
DROP CONSTRAINT omniscient_outcomes_match_id_fkey,                                                                                              
ADD CONSTRAINT omniscient_outcomes_match_id_fkey                                                                                                
  FOREIGN KEY (match_id) REFERENCES omniscient_matches(id) ON DELETE CASCADE;                                                                   
                                                                                                                                                
-- Fix omniscient_turns to cascade when users are deleted                                                                                       
ALTER TABLE omniscient_turns                                                                                                                    
DROP CONSTRAINT omniscient_turns_speaker_user_id_fkey,                                                                                          
ADD CONSTRAINT omniscient_turns_speaker_user_id_fkey                                                                                            
  FOREIGN KEY (speaker_user_id) REFERENCES users(id) ON DELETE CASCADE;                                                                         
                                                                                                                                                
                                                                                                                                                
-- Clean up user referrals when users are deleted                                                                                               
ALTER TABLE user_referrals                                                                                                                      
DROP CONSTRAINT user_referrals_user_id_fkey,                                                                                                    
ADD CONSTRAINT user_referrals_user_id_fkey                                                                                                      
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;                                                                                 
                                                                                                                                                
-- Clean up email logs when users are deleted (or keep SET NULL)                                                                                
ALTER TABLE email_logs                                                                                                                          
DROP CONSTRAINT email_logs_user_id_fkey,                                                                                                        
ADD CONSTRAINT email_logs_user_id_fkey                                                                                                          
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;                                                                                 
                                       