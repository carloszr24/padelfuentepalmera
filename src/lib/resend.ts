import { Resend } from 'resend';

let resend: Resend | null = null;

function getResend(): Resend {
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

export async function sendClubNotification({
  subject,
  html,
}: {
  subject: string;
  html: string;
}) {
  await getResend().emails.send({
    to: 'fuentepalmerapadel@gmail.com',
    from: 'info@padelfuentepalmera.com',
    subject,
    html,
  });
}
