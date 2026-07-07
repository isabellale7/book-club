type SendEmailArgs = {
  to: string;
  subject: string;
  text: string;
};

// Dev stub: logs the email instead of sending it. Swap this out for a real
// provider (Resend, Postmark, ...) once you have an account and a verified
// sending domain — the call sites don't need to change.
export async function sendEmail({ to, subject, text }: SendEmailArgs) {
  console.log(`\n----- EMAIL to ${to} -----`);
  console.log(`Subject: ${subject}`);
  console.log(text);
  console.log("----- END EMAIL -----\n");
}
