SUBJECT:

🌅 Your Morning Report - {{subject_suffix}}

HTML BODY:

<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Midnight Protocol Morning Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;
background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: white; }
    .header { background: #0a0a0a; color: #22ef5e; padding: 30px; text-align:
center; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
    .header .tagline { margin-top: 10px; opacity: 0.8; font-size: 14px; }
    .content { padding: 30px; }
    .greeting { font-size: 18px; margin-bottom: 20px; }
    .summary-box { background: #f8f9fa; border-radius: 8px; padding: 20px;
margin-bottom: 30px; }
    .summary-stat { display: inline-block; margin-right: 30px; }
    .summary-number { font-size: 24px; font-weight: bold; color: #22ef5e; }
    .summary-label { font-size: 12px; color: #666; text-transform: uppercase; }
    .discovery { background: white; border: 1px solid #e0e0e0; border-radius:
8px; padding: 20px; margin-bottom: 20px; }
    .discovery-header { display: flex; justify-content: space-between;
align-items: start; margin-bottom: 15px; }
    .discovery-user { font-weight: 600; font-size: 16px; }
    .discovery-type { font-size: 12px; padding: 4px 8px; border-radius: 4px;
text-transform: uppercase; }
    .type-strong { background: #22ef5e; color: #0a0a0a; }
    .type-exploratory { background: #40c4ff; color: white; }
    .type-future { background: #ff9800; color: white; }
    .discovery-summary { margin-bottom: 15px; color: #555; }
    .synergies { margin-bottom: 15px; }
    .synergy-item { background: #f0f8ff; padding: 8px 12px; border-radius: 4px;
  margin-bottom: 8px; font-size: 14px; }
    .intro-cta { display: inline-block; background: #22ef5e; color: #0a0a0a;
text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight:
600; margin-top: 10px; }
    .intro-cta:hover { background: #1dd54d; }
    .insights { background: #fafafa; border-radius: 8px; padding: 20px;
margin-top: 30px; }
    .insights h3 { margin-top: 0; color: #333; }
    .insight-list { margin: 10px 0; }
    .insight-item { margin-bottom: 8px; padding-left: 20px; position: relative;
  }
    .insight-item:before { content: "→"; position: absolute; left: 0; color:
#22ef5e; }
    .footer { background: #f5f5f5; padding: 30px; text-align: center;
font-size: 12px; color: #666; }
    .footer a { color: #22ef5e; text-decoration: none; }
    .no-discoveries { text-align: center; padding: 40px; color: #666; }
    .no-discoveries .emoji { font-size: 48px; margin-bottom: 20px; }
    .testing-notice { background: #fff3cd; border: 1px solid #ffeaa7; padding:
10px; margin-bottom: 20px; border-radius: 5px; color: #856404; }
  </style>
</head>
<body>
  <div class="container">
    {{testing_notice}}

    <div class="header">
      <h1>🌙 MIDNIGHT PROTOCOL</h1>
      <div class="tagline">Your AI agent worked while you slept</div>
    </div>

    <div class="content">
      <div class="greeting">
        Good morning{{user_name_greeting}}! ☀️
      </div>

      {{main_content}}
    </div>

    <div class="footer">
      <p>
        <a href="{{app_url}}/dashboard">View Full Report</a> •
        <a href="{{app_url}}/settings">Update Preferences</a> •
        <a href="{{app_url}}/unsubscribe?email={{user_email}}&type=morning_repo

rts">Unsubscribe</a>
</p>
<p style="margin-top: 15px;">
© {{current_year}} Midnight Protocol. Your AI agent works while you
sleep.
</p>
</div>

  </div>
</body>
</html>

TEXT BODY:

Good morning{{user_name_greeting}}!

Your Midnight Protocol Morning Report - {{report_date}}

{{main_text_content}}

View full report: {{app_url}}/dashboard
Update preferences: {{app_url}}/settings
Unsubscribe: {{app_url}}/unsubscribe?email={{user_email}}&type=morning_reports

© {{current_year}} Midnight Protocol
