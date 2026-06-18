const leadsBody = document.getElementById("leads-body");
const leadsEmpty = document.getElementById("leads-empty");

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json();
  if (!res.ok || data.ok === false) throw new Error(data.error || "Request failed");
  return data.result ?? data;
}

function setStatus(el, text, isError = false) {
  el.textContent = text;
  el.classList.toggle("error", isError);
}

function badge(stage) {
  return `<span class="badge badge-${stage}">${stage}</span>`;
}

function reasonText(lead) {
  if (lead.stage === "disqualified") return lead.qualification?.reason || "";
  if (lead.qualification?.painPoint) return lead.qualification.painPoint;
  return "";
}

function renderLeads(leads) {
  leadsBody.innerHTML = "";
  leadsEmpty.hidden = leads.length > 0;

  for (const lead of leads) {
    const tr = document.createElement("tr");
    const score = lead.qualification?.score ?? "-";
    const emailCell =
      lead.stage === "drafted" || lead.stage === "sent"
        ? `<button class="btn btn-ghost btn-small" data-action="view" data-domain="${lead.domain}">View / edit</button>`
        : "-";
    const sendCell =
      lead.stage === "drafted"
        ? `<button class="btn btn-primary btn-small" data-action="send" data-domain="${lead.domain}">Send</button>`
        : "";

    tr.innerHTML = `
      <td><strong>${lead.name || lead.domain}</strong><br><span class="hint">${lead.domain}</span></td>
      <td>${badge(lead.stage)}</td>
      <td>${score}</td>
      <td>${reasonText(lead)}</td>
      <td>${lead.contactEmail || "<span class=\"hint\">not set</span>"}</td>
      <td>${emailCell}</td>
      <td>${sendCell}</td>
    `;
    leadsBody.appendChild(tr);
  }
}

async function refreshLeads() {
  const leads = await api("/api/leads");
  renderLeads(leads);
  return leads;
}

document.getElementById("prospect-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const status = document.getElementById("prospect-status");
  const query = document.getElementById("prospect-query").value.trim();
  const num = Number(document.getElementById("prospect-num").value) || 10;
  const btn = e.target.querySelector("button");

  btn.disabled = true;
  setStatus(status, "Searching...");
  try {
    const added = await api("/api/prospect", {
      method: "POST",
      body: JSON.stringify({ query: query || undefined, num }),
    });
    setStatus(status, `Added ${added.length} new lead(s).`);
    await refreshLeads();
  } catch (err) {
    setStatus(status, err.message, true);
  } finally {
    btn.disabled = false;
  }
});

document.getElementById("run-btn").addEventListener("click", async (e) => {
  const status = document.getElementById("run-status");
  const btn = e.target;
  btn.disabled = true;
  setStatus(status, "Running pipeline...\n");

  try {
    const res = await fetch("/api/run", { method: "POST" });
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let lines = [];

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n");
      buffer = parts.pop();
      for (const part of parts) {
        if (!part) continue;
        const evt = JSON.parse(part);
        if (evt.ok === false) {
          lines.push(`error: ${evt.error}`);
        } else {
          const lead = evt.lead;
          lines.push(
            lead.stage === "disqualified"
              ? `${lead.domain}: disqualified (score ${lead.qualification.score})`
              : `${lead.domain}: drafted "${lead.email.subject}"`
          );
        }
        setStatus(status, lines.join("\n"));
        await refreshLeads();
      }
    }
    if (!lines.length) setStatus(status, "No prospected leads to process.");
  } catch (err) {
    setStatus(status, err.message, true);
  } finally {
    btn.disabled = false;
  }
});

document.getElementById("refresh-btn").addEventListener("click", () => refreshLeads());

document.getElementById("send-all-btn").addEventListener("click", async (e) => {
  const btn = e.target;
  btn.disabled = true;
  try {
    const sent = await api("/api/send-all", { method: "POST" });
    alert(`Sent ${sent.length} email(s).`);
    await refreshLeads();
  } catch (err) {
    alert(err.message);
  } finally {
    btn.disabled = false;
  }
});

// Modal for viewing/editing a drafted email, setting contact, and sending.
const modal = document.getElementById("email-modal");
let modalDomain = null;

leadsBody.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const { action, domain } = btn.dataset;

  if (action === "view") {
    const leads = await api("/api/leads");
    const lead = leads.find((l) => l.domain === domain);
    modalDomain = domain;
    document.getElementById("modal-domain").textContent = lead.name || lead.domain;
    document.getElementById("modal-subject").value = lead.email?.subject || "";
    document.getElementById("modal-body").value = lead.email?.body || "";
    document.getElementById("modal-contact").value = lead.contactEmail || "";
    setStatus(document.getElementById("modal-status"), "");
    modal.hidden = false;
  } else if (action === "send") {
    btn.disabled = true;
    try {
      await api(`/api/leads/${domain}/send`, { method: "POST" });
      await refreshLeads();
    } catch (err) {
      alert(err.message);
    } finally {
      btn.disabled = false;
    }
  }
});

document.getElementById("modal-close").addEventListener("click", () => {
  modal.hidden = true;
});

document.getElementById("modal-save-email").addEventListener("click", async () => {
  const status = document.getElementById("modal-status");
  const subject = document.getElementById("modal-subject").value;
  const body = document.getElementById("modal-body").value;
  try {
    await api(`/api/leads/${modalDomain}/email`, {
      method: "POST",
      body: JSON.stringify({ subject, body }),
    });
    setStatus(status, "Email saved.");
    await refreshLeads();
  } catch (err) {
    setStatus(status, err.message, true);
  }
});

document.getElementById("modal-save-contact").addEventListener("click", async () => {
  const status = document.getElementById("modal-status");
  const email = document.getElementById("modal-contact").value.trim();
  try {
    await api(`/api/leads/${modalDomain}/contact`, {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    setStatus(status, "Contact saved.");
    await refreshLeads();
  } catch (err) {
    setStatus(status, err.message, true);
  }
});

document.getElementById("modal-send").addEventListener("click", async () => {
  const status = document.getElementById("modal-status");
  try {
    await api(`/api/leads/${modalDomain}/send`, { method: "POST" });
    setStatus(status, "Sent.");
    await refreshLeads();
    setTimeout(() => (modal.hidden = true), 800);
  } catch (err) {
    setStatus(status, err.message, true);
  }
});

refreshLeads();
