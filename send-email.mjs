export default async (request) => {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Méthode non autorisée." }), {
      status: 405,
      headers: { "Content-Type": "application/json", "Allow": "POST" }
    });
  }

  const apiKey = Netlify.env.get("RESEND_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "La variable RESEND_API_KEY est introuvable dans Netlify." }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  let data;
  try {
    data = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Corps JSON invalide." }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const to = typeof data.to === "string" ? data.to.trim() : "";
  const subject = typeof data.subject === "string" ? data.subject.trim() : "";
  const message = typeof data.message === "string" ? data.message.trim() : "";

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(to) || !subject || !message || subject.length > 150 || message.length > 5000) {
    return new Response(JSON.stringify({ error: "Vérifie l'adresse, l'objet et le message." }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "Test site <onboarding@resend.dev>",
        to: [to],
        subject,
        text: message
      })
    });

    const result = await resendResponse.json().catch(() => ({}));
    if (!resendResponse.ok) {
      return new Response(JSON.stringify({
        error: result.message || result.name || "Resend a refusé l'envoi."
      }), {
        status: resendResponse.status,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ ok: true, id: result.id }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch {
    return new Response(JSON.stringify({ error: "Impossible de joindre Resend." }), {
      status: 502,
      headers: { "Content-Type": "application/json" }
    });
  }
};
