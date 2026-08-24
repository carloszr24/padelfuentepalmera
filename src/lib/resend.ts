import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function sendClubNotification({
  subject,
  html,
}: {
  subject: string;
  html: string;
}) {
  await resend.emails.send({
    to: 'fuentepalmerapadel@gmail.com',
    from: 'info@padelfuentepalmera.com',
    subject,
    html,
  });
}
