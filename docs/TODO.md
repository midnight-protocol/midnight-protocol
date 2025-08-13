[x] Fix omnisicient analysis
[x] Generate test users feature
[x] Emails working
[x] Morning reports
[ ] Dashboard to API/Services layers
[ ] Stripe integration
[ ] Omniscient dashboard still has some diretc supabase calls
[ ] Everything else to API/Services layers
[ ] supabase security and performance warnings
[ ] linter issues
[ ] analytics
[ ] system configs
[ ] automation w/ monitoring

Things not working:

1 - In matching system admin, running either a bulk match or a target user to user match looks like its doing something but then fails with this:
Failed to create match: OpenRouter API error: Bad Request - Bad Request (invalid or missing parameters)

2 - During onboarding, the JSON is being returned within the chat message itself and not applied to the Personal Story and Interview Progress bar.

3 - Newsletters - Just in general seems like this system is not working. I have gotten it to send me emails during prior testing, but it’s not working now.

4 - Basically I broke everything lol.

More minor issues that aren’t actually blocking

1 - When creating test users, using the random function usually returns the same phenotype written slightly differently, but with a lot of the same keywords. Guided generation just fails, but it did work previously, so not sure what broke. manage test users seems to only be able to auto-delete the last 20 created. I have about 80 created in there now I think.
