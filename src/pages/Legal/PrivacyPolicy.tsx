export default function PrivacyPolicy() {
  return (
    <article className="mx-auto max-w-2xl space-y-4 p-6">
      <h1 className="text-2xl font-bold">Privacy Policy</h1>
      <p>Last updated: August 2026. This app is operated in the Philippines and follows the Data Privacy Act of 2012 (RA 10173).</p>
      <h2 className="text-lg font-semibold">What we collect and why</h2>
      <ul className="list-disc pl-6">
        <li>Name, email, date of birth, and gender — to create and secure your account, and to enforce the 18+ age requirement.</li>
        <li>Event photos you upload — to show event details to other users.</li>
        <li>Your approximate location (only when you grant permission) — to show events near you.</li>
      </ul>
      <h2 className="text-lg font-semibold">Location data</h2>
      <p>We show other users a distance, never exact location. Your coordinates are never displayed on the app. If you do not grant location permission, you can still use the app with the manual city/barangay picker.</p>
      <h2 className="text-lg font-semibold">How long we keep data</h2>
      <p>We keep your data while your account is active. When you delete your account, we remove your profile data and uploaded photos.</p>
      <h2 className="text-lg font-semibold">Your right to delete</h2>
      <p>
        To delete your account and data, email{' '}
        <a href="mailto:hampasapp@gmail.com" className="underline">
          hampasapp@gmail.com
        </a>{' '}
        with the subject "Delete my account" from your registered email. We respond within 30 days.
      </p>
      <h2 className="text-lg font-semibold">Contact</h2>
      <p>
        Questions about this policy:{' '}
        <a href="mailto:hampasapp@gmail.com" className="underline">
          hampasapp@gmail.com
        </a>
        .
      </p>
    </article>
  );
}
