export default function PhishingInvalid() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border-subtle bg-surface-raised p-8 text-center">
        <h1 className="text-xl font-semibold text-white">Link not recognized</h1>
        <p className="mt-3 text-sm leading-relaxed text-gray-400">
          This link is invalid or has expired. If you believe this is a mistake, contact your
          security team.
        </p>
      </div>
    </div>
  )
}
