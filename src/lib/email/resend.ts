import "server-only";

type RegistrationReceiptInput = {
  to: string;
  fullName: string;
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

/**
 * Sends a separate AMANAH application receipt.
 * Supabase Auth remains responsible for its own email-verification message.
 * Call this only after the registration workflow has safely created the account.
 */
export async function sendRegistrationReceiptEmail({
  to,
  fullName,
}: RegistrationReceiptInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    throw new Error("Registration email is not configured on the server.");
  }

  const normalizedEmail = to.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error("A valid recipient email address is required.");
  }

  const safeName = escapeHtml(fullName.trim() || "AMANAH applicant");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [normalizedEmail],
      subject: "AMANAH distributor application received",
      text: [
        `Hello ${fullName.trim() || "there"},`,
        "",
        "We have received your AMANAH distributor registration application.",
        "Please check your separate Supabase email-verification message and follow its instructions.",
        "Your application remains subject to AMANAH's account review and approval process.",
        "",
        "Thank you,",
        "AMANAH Team",
      ].join("\n"),
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#24352b;max-width:600px;margin:0 auto">
          <h2 style="color:#243c31">AMANAH</h2>
          <p>Hello ${safeName},</p>
          <p>We have received your AMANAH distributor registration application.</p>
          <p>Please check your separate Supabase email-verification message and follow its instructions.</p>
          <p>Your application remains subject to AMANAH's account review and approval process.</p>
          <p>Thank you,<br><strong>AMANAH Team</strong></p>
        </div>
      `,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    // Do not expose provider response details or credentials to the browser.
    throw new Error("AMANAH registration receipt could not be sent.");
  }
}


/** Sends a configuration test only to the authenticated administrator's own account email. */
export async function sendResendTestEmail(to: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    throw new Error("Resend is not configured for this deployment.");
  }

  const normalizedEmail = to.trim().toLowerCase();
  if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(normalizedEmail)) {
    throw new Error("The administrator account does not have a valid email address.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [normalizedEmail],
      subject: "AMANAH email delivery test",
      text: "This is a test message from the AMANAH administrator workspace. Your Resend sender configuration is able to submit email.",
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Resend could not accept the test email. Check the sender and API key settings in Vercel.");
  }
}
