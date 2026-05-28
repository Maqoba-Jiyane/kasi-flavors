import nodemailer from "nodemailer";

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function createMailerTransport() {
  const host = getRequiredEnv("SMTP_HOST");
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = String(process.env.SMTP_SECURE || "true") === "true";
  const smtpRequireTls = process.env.SMTP_REQUIRE_TLS === "true";

  const allowInsecureLocal =
    process.env.NODE_ENV !== "production" &&
    process.env.SMTP_ALLOW_INSECURE_LOCAL === "true";

  return nodemailer.createTransport({
    host,
    port,
    secure,
    requireTLS: smtpRequireTls,
    auth: {
      user: getRequiredEnv("SMTP_USER"),
      pass: getRequiredEnv("SMTP_PASS"),
    },
    tls: {
      servername: host,
      minVersion: "TLSv1.2",

      /**
       * Keep this false in production.
       * Only set SMTP_ALLOW_INSECURE_LOCAL=true temporarily if your local machine
       * keeps throwing "self-signed certificate in certificate chain".
       */
      rejectUnauthorized: !allowInsecureLocal,
    },
  });
}

export function getFromEmail() {
  return process.env.FROM_EMAIL || process.env.SMTP_USER || "";
}
