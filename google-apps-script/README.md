# Email Apply Watcher — Setup

This lets candidates apply by emailing a resume directly, alongside the existing `/apply/{jobId}` web form. It runs entirely inside your own Google account, not on Vercel — nothing to host.

## How it works

Each job posting on the Pipeline page now shows an email address like `yourname+96a5ef07@gmail.com`, next to the existing apply link. Gmail delivers `you+anything@gmail.com` to your normal inbox for free. A small script (this folder) checks your inbox every 5 minutes, reads the job ID back out of the `+` tag, and sends the resume to TalentProof to be scored exactly like a web form submission.

## One-time setup

1. **Set the secret in Vercel.** In your Vercel project → Settings → Environment Variables, add:
   ```
   EMAIL_APPLY_SECRET=<a long random string>
   ```
   The same value used in `.env.local` locally works fine. Redeploy after adding it.

2. **Create the Apps Script project.**
   - Go to [script.google.com](https://script.google.com), sign in with the same Google account as `EMAIL_USER`.
   - Click **New project**.
   - Delete the placeholder code, paste in the full contents of `email-apply-watcher.gs.js`.

3. **Fill in the two config values** at the top of the script:
   - `WEBHOOK_URL` — your deployed app's URL plus `/api/apply/email` (e.g. `https://talentproof-zeta.vercel.app/api/apply/email`)
   - `SHARED_SECRET` — the exact same value you set as `EMAIL_APPLY_SECRET` in Vercel

4. **Run `setupTrigger` once.** In the Apps Script editor, select `setupTrigger` from the function dropdown at the top, then click **Run**. Google will ask you to authorize the script to read your Gmail — this is your own account, the permission prompt is Google's, not TalentProof's. Approve it.

That's it. `checkForNewApplications` now runs automatically every 5 minutes. No further action needed.

## Checking it's working

- In Gmail, after a resume email is processed, it gets a `TalentProof-Processed` label. If something went wrong (bad attachment, webhook error), it also gets `TalentProof-Failed` — check that label first if an application doesn't show up.
- In the Apps Script editor, **Executions** (left sidebar) shows a log of every run, including any errors.
- Applications that come in this way appear on the Pipeline board exactly like web form applications — same score, same evidence, same Approve flow.

## Notes

- Only messages sent to a `+jobId` tagged address are touched. Normal inbox mail is left alone entirely — it's never labeled or read.
- Delay is a few minutes, not instant, since it's checked on a timer rather than triggered the moment an email arrives.
- If you ever delete a job posting, its `+jobId` address simply stops matching any real job — the webhook will reply "This job posting no longer exists," and the script marks it `TalentProof-Failed`.
