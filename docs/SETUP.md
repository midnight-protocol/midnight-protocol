# Praxis Network Setup Guide

## Prerequisites
- Node.js 18+ and npm
- Supabase account
- OpenRouter account with API access
- Resend account for email delivery

## Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/midnight-protocol-ui-forge.git
   cd midnight-protocol-ui-forge
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your values
   ```

4. **Set up Supabase**
   - Create a new Supabase project
   - Run migrations: `npm run db:migrate`
   - Set environment variables in Supabase dashboard

5. **Configure OpenRouter**
   - Sign up at https://openrouter.ai/
   - Generate API key
   - Add to .env.local and Supabase environment

6. **Start development server**
   ```bash
   npm run dev
   ```

## Environment Variables Explained

### Required Variables

**OPENROUTER_API_KEY**
- Get from: https://openrouter.ai/keys
- Used for: All AI conversations
- Format: `sk-or-v1-xxxxx`
- CRITICAL: Without this, no AI features work

**SUPABASE_URL & SUPABASE_ANON_KEY**
- Get from: Project Settings > API in Supabase
- Used for: Database and authentication

**RESEND_API_KEY**
- Get from: https://resend.com/api-keys
- Used for: Sending emails (morning reports, notifications)

### Setting Variables in Supabase

1. Go to Project Settings > Edge Functions
2. Add these secrets:
   - OPENROUTER_API_KEY
   - RESEND_API_KEY
   - RESEND_WEBHOOK_SECRET

## Troubleshooting

**"OpenRouter API key not configured" error**
- Check Supabase Edge Functions settings
- Verify key starts with `sk-or-v1-`
- Test key at https://openrouter.ai/playground

**Database connection issues**
- Verify Supabase URL is correct
- Check if project is paused (free tier)
- Ensure anon key matches project