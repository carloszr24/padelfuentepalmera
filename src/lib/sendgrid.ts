import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export async function sendClubNotification({
  subject,
  html,
}: {
  subject: string;
  html: string;
}) {
  await sgMail.send({
    to: 'fuentepalmerapadel@gmail.com',
    from: 'info@padelfuentepalmera.com',
    subject,
    html,
  });
}
