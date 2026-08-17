/**
 * TalentProof — Email Apply Watcher
 *
 * Not part of the Next.js app. This runs inside Google Apps Script under
 * your own Google account (script.google.com), on a timer Google manages
 * for you — nothing to host, nothing to keep running.
 *
 * What it does, each time it runs:
 *   1. Looks at recent inbox mail with an attachment, not yet processed.
 *   2. Keeps only messages sent to your-address+<jobId>@gmail.com — the
 *      jobId is read straight from the "To" header, so there is no
 *      guessing which job posting an email is for.
 *   3. Sends the sender's email, the resume attachment, and the jobId to
 *      TalentProof's /api/apply/email endpoint, protected by a shared
 *      secret so nothing else can call it.
 *   4. Labels the message so it is never processed twice.
 *
 * SETUP (see google-apps-script/README.md for the full walkthrough):
 *   1. Fill in WEBHOOK_URL and SHARED_SECRET below.
 *   2. Paste this whole file into a new Apps Script project.
 *   3. Run `setupTrigger` once, by hand, to schedule `checkForNewApplications`
 *      to run automatically every 5 minutes.
 */

// ---- Configuration: fill these in before running -------------------------
const WEBHOOK_URL = 'https://talentproof-zeta.vercel.app/api/apply/email';
const SHARED_SECRET = 'REPLACE_WITH_EMAIL_APPLY_SECRET_FROM_ENV';
// ---------------------------------------------------------------------------

const PROCESSED_LABEL = 'TalentProof-Processed';
const FAILED_LABEL = 'TalentProof-Failed';

function checkForNewApplications() {
  const processedLabel = getOrCreateLabel(PROCESSED_LABEL);
  const failedLabel = getOrCreateLabel(FAILED_LABEL);

  // has:attachment keeps this cheap to run every few minutes; a resume
  // application always has one. newer_than bounds it to recent mail only.
  const threads = GmailApp.search('in:inbox has:attachment newer_than:7d -label:' + PROCESSED_LABEL, 0, 20);

  threads.forEach(thread => {
    const messages = thread.getMessages();
    messages.forEach(message => {
      // Re-check per message, not just per thread, since labels apply per-thread.
      if (message.getLabels && message.getThread().getLabels().some(l => l.getName() === PROCESSED_LABEL)) return;

      const toHeader = message.getTo() || '';
      const jobId = extractJobId(toHeader);
      if (!jobId) {
        // Not an apply address — just leave this thread alone entirely,
        // don't label it, don't touch normal inbox mail.
        return;
      }

      const attachment = message.getAttachments().find(a => isResumeFile(a.getName()));
      if (!attachment) {
        Logger.log('Skipped (no PDF/DOCX attachment): ' + message.getSubject());
        thread.addLabel(processedLabel);
        return;
      }

      const candidateEmail = extractEmailAddress(message.getFrom());
      const payload = {
        jobPostingId: jobId,
        candidateEmail: candidateEmail,
        candidateName: null,
        fileName: attachment.getName(),
        fileBase64: Utilities.base64Encode(attachment.getBytes()),
      };

      try {
        const response = UrlFetchApp.fetch(WEBHOOK_URL, {
          method: 'post',
          contentType: 'application/json',
          headers: { 'x-apply-secret': SHARED_SECRET },
          payload: JSON.stringify(payload),
          muteHttpExceptions: true,
        });

        const ok = response.getResponseCode() >= 200 && response.getResponseCode() < 300;
        Logger.log((ok ? 'OK ' : 'FAILED ') + candidateEmail + ' -> job ' + jobId + ': ' + response.getContentText());

        thread.addLabel(processedLabel);
        if (!ok) thread.addLabel(failedLabel);
      } catch (err) {
        Logger.log('ERROR calling webhook for ' + candidateEmail + ': ' + err.message);
        thread.addLabel(processedLabel);
        thread.addLabel(failedLabel);
      }
    });
  });
}

// Reads "yourname+96a5ef07@gmail.com" out of a To header and returns
// "96a5ef07", or null if the header has no "+" tag at all.
function extractJobId(toHeader) {
  const match = toHeader.match(/\+([a-zA-Z0-9-]+)@/);
  return match ? match[1] : null;
}

function extractEmailAddress(fromHeader) {
  const match = fromHeader.match(/<(.+)>/);
  return match ? match[1] : fromHeader.trim();
}

function isResumeFile(fileName) {
  const ext = fileName.split('.').pop().toLowerCase();
  return ext === 'pdf' || ext === 'docx';
}

function getOrCreateLabel(name) {
  return GmailApp.getUserLabelByName(name) || GmailApp.createLabel(name);
}

// Run this once, by hand, from the Apps Script editor to schedule
// checkForNewApplications to run automatically every 5 minutes.
function setupTrigger() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'checkForNewApplications') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('checkForNewApplications')
    .timeBased()
    .everyMinutes(5)
    .create();
  Logger.log('Trigger scheduled: checkForNewApplications will run every 5 minutes.');
}
