import { signIn } from "@/auth";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <div>
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <p className="mt-1 text-sm text-gray-600">
          We&apos;ll email you a magic link — no password needed.
        </p>
      </div>
      <form
        action={async (formData) => {
          "use server";
          await signIn("nodemailer", formData);
        }}
        className="flex flex-col gap-3"
      >
        <input
          type="email"
          name="email"
          required
          placeholder="you@example.com"
          className="rounded-md border border-gray-300 px-3 py-2 text-base"
        />
        <button
          type="submit"
          className="rounded-md bg-gray-900 px-3 py-2 text-base font-medium text-white"
        >
          Send magic link
        </button>
      </form>
    </main>
  );
}
