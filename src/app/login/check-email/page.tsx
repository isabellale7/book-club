export default function CheckEmailPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-3 px-4 text-center">
      <h1 className="text-2xl font-semibold">Check your email</h1>
      <p className="text-sm text-gray-600">
        We sent you a sign-in link. In local dev, look for it in the terminal
        running <code>npm run dev</code> instead of your inbox.
      </p>
    </main>
  );
}
