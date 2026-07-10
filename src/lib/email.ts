import { Resend } from "resend";

type SendEmailArgs = {
  to: string;
  subject: string;
  text: string;
};

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// Resend's sandbox sender (onboarding@resend.dev) only delivers to the email
// address on your own Resend account, until you verify a custom domain and
// set EMAIL_FROM to an address at that domain.
const FROM = process.env.EMAIL_FROM ?? "Book Club <onboarding@resend.dev>";

export async function sendEmail({ to, subject, text }: SendEmailArgs) {
  if (!resend) {
    // No RESEND_API_KEY configured: log instead of sending, so the app still
    // works out of the box without a provider account.
    console.log(`\n----- EMAIL to ${to} -----`);
    console.log(`Subject: ${subject}`);
    console.log(text);
    console.log("----- END EMAIL -----\n");
    return;
  }

  const { data, error } = await resend.emails.send({
    from: FROM,
    to,
    subject,
    text,
  });
  if (error) {
    throw new Error(`Failed to send email to ${to}: ${error.message}`);
  }
  console.log(`Email sent to ${to} (id: ${data?.id})`);
}
