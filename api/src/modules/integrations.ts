import { Router } from "express";

export const integrationsRouter = Router();

const integrations = [
  { name: "payments", status: "coming_soon", configured: false },
  { name: "whatsapp", status: "coming_soon", configured: false },
  { name: "sms", status: "coming_soon", configured: false },
];

integrationsRouter.get("/status", (_req, res) => {
  res.json({
    integrations,
    message: "Third-party services are not connected yet. Core account and supplier features remain available.",
  });
});

integrationsRouter.post("/whatsapp/messages", (_req, res) => {
  res.status(503).json({
    error: "WhatsApp messaging is coming soon. No message was sent.",
    code: "WHATSAPP_UNAVAILABLE",
  });
});
