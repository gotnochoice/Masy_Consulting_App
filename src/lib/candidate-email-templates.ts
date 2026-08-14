type EmailContent = { subject: string; body: string };

export function rejectionEmail(candidateName: string, roleTitle: string, companyName: string): EmailContent {
  return {
    subject: `Update on your application for ${roleTitle} at ${companyName}`,
    body:
      `Hi ${candidateName},\n\n` +
      `Thank you for taking the time to apply for the ${roleTitle} role at ${companyName}, and for your interest in the team.\n\n` +
      `After careful review, we've decided to move forward with other candidates for this particular role. This isn't a reflection of your abilities, we simply had a specific fit in mind for this position.\n\n` +
      `We'll keep your application on file and would welcome you applying for future roles that match your experience.\n\n` +
      `Wishing you the best in your search.\n\n` +
      `Best regards,\nThe ${companyName} Hiring Team\n(via Masy Consulting)\n\n` +
      `This is an automated message. Please don't reply to this email.`,
  };
}

export function interviewInviteEmail(
  candidateName: string,
  roleTitle: string,
  companyName: string,
  schedulingLink?: string | null,
): EmailContent {
  const schedulingLine = schedulingLink
    ? `Please use the link below to pick a time that works for you:\n${schedulingLink}`
    : `Please reply to this email with a couple of times that work for you over the next few days, and we'll confirm a slot.`;

  return {
    subject: `Interview invitation: ${roleTitle} at ${companyName}`,
    body:
      `Hi ${candidateName},\n\n` +
      `Thank you for applying for the ${roleTitle} role at ${companyName}. We were impressed with your application and would like to invite you to an interview.\n\n` +
      `${schedulingLine}\n\n` +
      `Looking forward to speaking with you.\n\n` +
      `Best regards,\nThe ${companyName} Hiring Team\n(via Masy Consulting)`,
  };
}

export function offerEmail(candidateName: string, roleTitle: string, companyName: string): EmailContent {
  return {
    subject: `Good news about your application for ${roleTitle} at ${companyName}`,
    body:
      `Hi ${candidateName},\n\n` +
      `We're pleased to let you know that ${companyName} would like to move forward with an offer for the ${roleTitle} role.\n\n` +
      `Someone from our team will be in touch shortly with the full offer details. In the meantime, please don't hesitate to reach out if you have any questions.\n\n` +
      `Congratulations, and we're looking forward to the possibility of working together.\n\n` +
      `Best regards,\nThe ${companyName} Hiring Team\n(via Masy Consulting)`,
  };
}
