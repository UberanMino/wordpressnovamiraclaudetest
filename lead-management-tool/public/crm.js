let companies = [];
let activeId = null;
let chatHistory = [];

const listEl = document.getElementById("crm-list");
const detailEl = document.getElementById("crm-detail");
const searchEl = document.getElementById("crm-search");
const statusFilterEl = document.getElementById("crm-status-filter");

function statusClass(status) {
  return `status-${(status || "").replace(/\s+/g, "_")}`;
}

function latestStatus(company) {
  const deals = company.deals || [];
  return deals[deals.length - 1]?.status || "-";
}

async function loadCompanies() {
  const res = await fetch("/api/companies");
  const data = await res.json();
  companies = data.result || [];
  renderList();
}

function filtered() {
  const q = searchEl.value.trim().toLowerCase();
  const statusFilter = statusFilterEl.value;
  return companies.filter((c) => {
    if (statusFilter && latestStatus(c) !== statusFilter) return false;
    if (!q) return true;
    const haystack = [c.name, ...(c.contacts || []).map((ct) => ct.name)].join(" ").toLowerCase();
    return haystack.includes(q);
  });
}

function renderList() {
  const rows = filtered();
  listEl.innerHTML = rows
    .map(
      (c) => `
    <div class="crm-company-row ${c.id === activeId ? "active" : ""}" data-id="${c.id}">
      <div class="name">${c.name}</div>
      <div class="sub">${c.country || ""} &middot; <span class="status-pill ${statusClass(latestStatus(c))}">${latestStatus(c)}</span></div>
    </div>`
    )
    .join("");
  if (!rows.length) listEl.innerHTML = `<p class="empty-state">No companies match.</p>`;
}

function emailBlock(company) {
  const draft = company.emailDraft;
  return `
    <div class="crm-section" id="email-section">
      <h3>Cold / follow-up email</h3>
      <div class="row" style="margin-bottom:10px;">
        <button class="btn btn-primary btn-small" id="draft-email-btn">${draft ? "Re-draft with AI" : "Draft with AI"}</button>
      </div>
      ${
        draft
          ? `<div class="email-box">
              <label>Subject</label>
              <input type="text" id="email-subject" value="${(draft.subject || "").replace(/"/g, "&quot;")}" style="width:100%;margin-bottom:8px;" />
              <label>Body</label>
              <textarea id="email-body" rows="10" style="width:100%;">${draft.body || ""}</textarea>
              <div class="row" style="margin-top:8px;">
                <button class="btn btn-ghost btn-small" id="save-email-btn">Save edits</button>
              </div>
            </div>`
          : `<p class="hint">No draft yet. Click "Draft with AI" to generate one grounded in this lead's recorded needs.</p>`
      }
    </div>`;
}

function renderDetail(company) {
  const contacts = company.contacts || [];
  const deals = company.deals || [];

  detailEl.innerHTML = `
    <div class="crm-section">
      <h3>Company</h3>
      <h2 style="margin:0 0 4px;">${company.name}</h2>
      <p class="hint" style="margin-bottom:10px;">${company.country || ""}${company.address ? " &middot; " + company.address : ""}</p>
      <p><strong>Industry:</strong> ${company.industry || "<span class=\"hint\">unknown</span>"}</p>
      <p><strong>What they do:</strong> ${company.description || "<span class=\"hint\">unknown &mdash; click Enrich</span>"}</p>
      <button class="btn btn-ghost btn-small" id="enrich-btn">Enrich with AI</button>
    </div>

    <div class="crm-section">
      <h3>Contacts</h3>
      ${
        contacts.length
          ? contacts
              .map(
                (c) => `<div class="contact-card">
                  <div class="name">${c.name}</div>
                  <div class="meta">${c.position || ""}</div>
                  <div class="meta">${c.email ? `<a href="mailto:${c.email}">${c.email}</a>` : "no email"} ${c.phone ? "&middot; " + c.phone : ""}</div>
                </div>`
              )
              .join("")
          : `<p class="hint">No contact captured yet.</p>`
      }
    </div>

    <div class="crm-section">
      <h3>Needs &amp; deal history</h3>
      ${deals
        .map(
          (d) => `<div class="deal-row">
            <span class="status-pill ${statusClass(d.status)}">${d.status || "-"}</span>
            ${d.date ? `<span class="hint">${d.date.slice(0, 10)}</span>` : ""}
            <div>${(d.need || "").replace(/\n/g, "<br>")}</div>
            ${d.notes ? `<div class="hint">${d.notes}</div>` : ""}
            ${d.notes2 ? `<div class="hint">${d.notes2}</div>` : ""}
            ${d.revenue ? `<div class="hint">Revenue: &euro;${d.revenue}</div>` : ""}
          </div>`
        )
        .join("")}
    </div>

    ${emailBlock(company)}

    <div class="crm-section">
      <h3>Research assistant</h3>
      <p class="hint">Ask about anything missing &mdash; e.g. "who would be the right contact for logistics decisions here?"</p>
      <div class="chat-window" id="chat-window"></div>
      <div class="row">
        <input type="text" id="chat-input" placeholder="Ask the research assistant..." style="flex:1;" />
        <button class="btn btn-primary btn-small" id="chat-send-btn">Ask</button>
      </div>
    </div>
  `;

  document.getElementById("enrich-btn").addEventListener("click", () => enrich(company.id));
  document.getElementById("draft-email-btn").addEventListener("click", () => draftEmail(company.id));
  const saveBtn = document.getElementById("save-email-btn");
  if (saveBtn) saveBtn.addEventListener("click", () => saveEmail(company.id));
  document.getElementById("chat-send-btn").addEventListener("click", () => sendChat(company.id));
  document.getElementById("chat-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendChat(company.id);
  });
  renderChat();
}

function renderChat() {
  const win = document.getElementById("chat-window");
  if (!win) return;
  win.innerHTML = chatHistory
    .map(
      (m) =>
        `<div class="chat-msg"><span class="who">${m.role === "user" ? "You" : "Assistant"}</span>${m.content}</div>`
    )
    .join("");
  win.scrollTop = win.scrollHeight;
}

async function selectCompany(id) {
  activeId = id;
  chatHistory = [];
  renderList();
  const res = await fetch(`/api/companies/${id}`);
  const data = await res.json();
  if (data.ok) renderDetail(data.result);
}

async function enrich(id) {
  const btn = document.getElementById("enrich-btn");
  btn.disabled = true;
  btn.textContent = "Enriching...";
  const res = await fetch(`/api/companies/${id}/enrich`, { method: "POST" });
  const data = await res.json();
  if (data.ok) {
    const idx = companies.findIndex((c) => c.id === id);
    companies[idx] = data.result;
    renderDetail(data.result);
  } else {
    alert(`Enrich failed: ${data.error}`);
    btn.disabled = false;
    btn.textContent = "Enrich with AI";
  }
}

async function draftEmail(id) {
  const btn = document.getElementById("draft-email-btn");
  btn.disabled = true;
  btn.textContent = "Drafting...";
  const res = await fetch(`/api/companies/${id}/draft-email`, { method: "POST" });
  const data = await res.json();
  if (data.ok) {
    const idx = companies.findIndex((c) => c.id === id);
    companies[idx] = data.result;
    renderDetail(data.result);
  } else {
    alert(`Draft failed: ${data.error}`);
    btn.disabled = false;
    btn.textContent = "Draft with AI";
  }
}

async function saveEmail(id) {
  const subject = document.getElementById("email-subject").value;
  const body = document.getElementById("email-body").value;
  const res = await fetch(`/api/companies/${id}/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subject, body }),
  });
  const data = await res.json();
  if (data.ok) {
    const idx = companies.findIndex((c) => c.id === id);
    companies[idx] = data.result;
  }
}

async function sendChat(id) {
  const input = document.getElementById("chat-input");
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  chatHistory.push({ role: "user", content: text });
  renderChat();

  const res = await fetch(`/api/companies/${id}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: chatHistory.map((m) => ({ role: m.role, content: m.content })) }),
  });
  const data = await res.json();
  chatHistory.push({ role: "assistant", content: data.ok ? data.result.reply : `Error: ${data.error}` });
  renderChat();
}

listEl.addEventListener("click", (e) => {
  const row = e.target.closest(".crm-company-row");
  if (row) selectCompany(row.dataset.id);
});
searchEl.addEventListener("input", renderList);
statusFilterEl.addEventListener("change", renderList);

loadCompanies();
