// The hiring pipeline stages every application moves through, in order.
export const STAGES = [
  'applied',
  'shortlisted',
  'interview_scheduled',
  'interviewed',
  'offer',
  'hired',
];
export const REJECTED = 'rejected';

export const STAGE_LABELS = {
  applied: 'Applied',
  shortlisted: 'Shortlisted',
  interview_scheduled: 'Interview Scheduled',
  interviewed: 'Interviewed',
  offer: 'Offer Extended',
  hired: 'Hired',
  rejected: 'Rejected',
};

/**
 * Suggests the next action for an application based on its current stage
 * and its real, already-computed evidence-backed score. This is
 * deliberately plain threshold logic, not another AI call layered on top
 * of AI: the recommendation is auditable and explainable on its own, and
 * it never takes effect until a recruiter clicks Approve.
 */
export function getRecommendation(application) {
  const score = application.matchPercentage || 0;

  if (application.stage === 'applied') {
    if (score >= 75) {
      return { action: 'shortlisted', label: 'Shortlist for interview', reasoning: `${score}% match with strong evidence behind it.` };
    }
    if (score >= 45) {
      return { action: 'shortlisted', label: 'Worth a manual look', reasoning: `${score}% match, moderate fit, recommend reviewing evidence before deciding.` };
    }
    return { action: REJECTED, label: 'Recommend reject', reasoning: `${score}% match, missing key skills for this role.` };
  }
  if (application.stage === 'shortlisted') {
    return { action: 'interview_scheduled', label: 'Schedule interview', reasoning: 'Already shortlisted, next step is scheduling.' };
  }
  if (application.stage === 'interview_scheduled') {
    return { action: 'interviewed', label: 'Mark as interviewed', reasoning: 'Once the interview has taken place.' };
  }
  if (application.stage === 'interviewed') {
    return { action: 'offer', label: 'Extend offer', reasoning: 'Recruiter judgment call based on the interview itself, not something this app observed.' };
  }
  if (application.stage === 'offer') {
    return { action: 'hired', label: 'Mark as hired', reasoning: 'Once the candidate accepts.' };
  }
  return null; // hired or rejected: no further action
}

export function isValidStage(stage) {
  return STAGES.includes(stage) || stage === REJECTED;
}
