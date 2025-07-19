import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { handleCorsPreflightRequest, corsSuccessResponse, corsErrorResponse } from '../_shared/cors.ts';

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  try {
    const { report_date, user_id } = await req.json();
    const targetDate = report_date || new Date().toISOString().split('T')[0];

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let reportsGenerated = 0;

    // Get users who need reports
    let query = supabase
      .from('users')
      .select(`
        id,
        username,
        full_name,
        email,
        timezone,
        personal_story:personal_story_id(*),
        agent_profiles(name, communication_style)
      `)
      .eq('status', 'APPROVED');

    if (user_id) {
      query = query.eq('id', user_id);
    }

    const { data: users, error: usersError } = await query;

    if (usersError) throw usersError;

    for (const user of users || []) {
      try {
        console.log(`Generating morning report for user ${user.username}`);
        
        // Get conversations from the target date
        const { data: conversations, error: convError } = await supabase
          .from('agent_conversations')
          .select(`
            *,
            user_a:users!agent_conversations_user_a_id_fkey(
              id, username, full_name, 
              personal_story:personal_story_id(narrative, current_focus, seeking_connections)
            ),
            user_b:users!agent_conversations_user_b_id_fkey(
              id, username, full_name,
              personal_story:personal_story_id(narrative, current_focus, seeking_connections)
            ),
            conversation_turns(*)
          `)
          .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
          .gte('created_at', `${targetDate}T00:00:00Z`)
          .lt('created_at', `${targetDate}T23:59:59Z`)
          .order('quality_score', { ascending: false });

        if (convError) {
          console.error(`Error fetching conversations for user ${user.id}:`, convError);
          continue;
        }

        // Process conversations into discoveries
        const discoveries = await Promise.all((conversations || []).map(async (conv) => {
          const otherUser = conv.user_a_id === user.id ? conv.user_b : conv.user_a;
          const userAgent = user.agent_profiles?.[0]?.name || 'Your agent';
          const otherAgent = otherUser?.username ? `${otherUser.username}'s agent` : 'Their agent';
          
          // Extract key insights from the conversation
          const turns = conv.conversation_turns || [];
          const keyInsights = [];
          
          // Look for specific patterns in conversation
          for (const turn of turns) {
            if (turn.content?.toLowerCase().includes('opportunity') || 
                turn.content?.toLowerCase().includes('collaborate') ||
                turn.content?.toLowerCase().includes('help with')) {
              keyInsights.push(turn.content.slice(0, 150) + '...');
            }
          }

          // Generate a compelling summary if none exists
          let summary = conv.summary;
          if (!summary && conv.outcome?.synergies) {
            summary = `${userAgent} discovered ${conv.outcome.synergies.length} potential synergies with ${otherUser?.full_name || otherUser?.username}`;
          }

          return {
            conversation_id: conv.id,
            match_type: conv.outcome?.match_quality || 'exploratory',
            match_score: conv.quality_score || 0,
            other_user: {
              id: otherUser?.id,
              username: otherUser?.username || 'Unknown',
              full_name: otherUser?.full_name,
              seeking: otherUser?.personal_story?.seeking_connections || [],
              focus: otherUser?.personal_story?.current_focus || []
            },
            opportunity_summary: summary || `${userAgent} explored potential collaboration with ${otherUser?.full_name || otherUser?.username}`,
            synergies: conv.outcome?.synergies || [],
            key_insights: keyInsights.slice(0, 3),
            conversation_snippet: turns.slice(0, 2).map(t => ({
              speaker: t.speaker === 'agent_a' ? (conv.user_a_id === user.id ? userAgent : otherAgent) : (conv.user_b_id === user.id ? userAgent : otherAgent),
              content: t.content?.slice(0, 200) + '...'
            })),
            created_at: conv.created_at
          };
        }));

        // Sort discoveries by relevance
        const sortedDiscoveries = discoveries.sort((a, b) => {
          // Prioritize strong matches
          if (a.match_type === 'strong' && b.match_type !== 'strong') return -1;
          if (b.match_type === 'strong' && a.match_type !== 'strong') return 1;
          // Then by match score
          return (b.match_score || 0) - (a.match_score || 0);
        });

        // Calculate activity summary
        const activitySummary = {
          total_conversations: conversations?.length || 0,
          strong_matches: discoveries.filter(d => d.match_type === 'strong').length,
          exploratory_connections: discoveries.filter(d => d.match_type === 'exploratory').length,
          future_potential: discoveries.filter(d => d.match_type === 'future').length,
          agent_name: user.agent_profiles?.[0]?.name || 'Your agent'
        };

        // Generate agent insights using AI
        let agentInsights = {
          patterns_observed: [],
          top_opportunities: [],
          recommended_actions: []
        };

        if (discoveries.length > 0) {
          // Create a summary for AI to analyze
          const conversationSummary = discoveries.slice(0, 5).map(d => 
            `Conversation with ${d.other_user.username}: ${d.opportunity_summary} (Synergies: ${d.synergies.join(', ')})`
          ).join('\n');

          const insightPrompt = `Based on these agent conversations, provide brief insights:

${conversationSummary}

User's focus areas: ${user.personal_story?.current_focus?.join(', ') || 'Not specified'}
User seeking: ${user.personal_story?.seeking_connections?.join(', ') || 'Not specified'}

Provide a JSON response with:
1. "patterns": Array of 2-3 patterns observed across conversations (15 words each)
2. "opportunities": Array of 2-3 specific opportunities to pursue (20 words each)
3. "actions": Array of 2-3 recommended next steps (15 words each)`;

          try {
            const aiResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/openrouter-chat`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                messages: [
                  { 
                    role: 'system', 
                    content: 'You are an AI assistant that analyzes agent conversations and provides JSON-formatted insights. Always respond with valid JSON.'
                  },
                  { 
                    role: 'user', 
                    content: insightPrompt 
                  }
                ],
                operation: 'reporting'
              })
            });

            if (aiResponse.ok) {
              const response = await aiResponse.json();
              // The response has a 'message' field with the content
              const messageContent = response.message || response.content;
              try {
                const insights = JSON.parse(messageContent);
                agentInsights = {
                  patterns_observed: insights.patterns || [],
                  top_opportunities: insights.opportunities || [],
                  recommended_actions: insights.actions || []
                };
              } catch (parseError) {
                console.error('Failed to parse AI insights JSON:', parseError);
                console.log('Raw response:', messageContent);
              }
            }
          } catch (error) {
            console.error('Failed to generate AI insights:', error);
          }
        }

        // Create or update morning report
        const reportData = {
          user_id: user.id,
          report_date: targetDate,
          discoveries: sortedDiscoveries,
          activity_summary: activitySummary,
          agent_insights: agentInsights,
          status: 'generated',
          generated_at: new Date().toISOString()
        };

        const { error: reportError } = await supabase
          .from('morning_reports')
          .upsert(reportData, {
            onConflict: 'user_id,report_date'
          });

        if (reportError) {
          console.error(`Error creating report for user ${user.id}:`, reportError);
          continue;
        }

        reportsGenerated++;
        console.log(`✅ Generated morning report for ${user.username}`);

      } catch (userError) {
        console.error(`Error processing user ${user.id}:`, userError);
        continue;
      }
    }

    return corsSuccessResponse({
      success: true,
      reports_generated: reportsGenerated,
      report_date: targetDate,
      total_users: users?.length || 0
    });

  } catch (error: any) {
    console.error("Error in generate-morning-reports function:", error);
    return corsErrorResponse(error.message || 'Internal server error');
  }
};

serve(handler);