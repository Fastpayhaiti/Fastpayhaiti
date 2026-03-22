const REPO_BASE = "/Fastpayhaiti";
const API_BASE = "https://fastpayhaiti.onrender.com";

function openMenu() {
  const sideMenu = document.getElementById("sideMenu");
  const menuOverlay = document.getElementById("menuOverlay");
  if (sideMenu) sideMenu.classList.add("open");
  if (menuOverlay) menuOverlay.classList.add("show");
}

function closeMenu() {
  const sideMenu = document.getElementById("sideMenu");
  const menuOverlay = document.getElementById("menuOverlay");
  if (sideMenu) sideMenu.classList.remove("open");
  if (menuOverlay) menuOverlay.classList.remove("show");
}

function menuHtml() {
  return `
    <button class="menu-btn" onclick="openMenu()">☰</button>

    <div class="menu-overlay" id="menuOverlay" onclick="closeMenu()"></div>

    <div class="side-menu" id="sideMenu">
      <div class="topbar">
        <h2>FastPay Menu</h2>
        <button class="menu-btn" onclick="closeMenu()">×</button>
      </div>

      <a class="menu-link" href="${REPO_BASE}/index.html">🏠 Home</a>
      <a class="menu-link" href="${REPO_BASE}/deposit.html">💰 Deposit</a>
      <a class="menu-link" href="${REPO_BASE}/withdraw.html">💸 Withdraw</a>
      <a class="menu-link" href="${REPO_BASE}/send.html">📨 Send</a>
      <a class="menu-link" href="${REPO_BASE}/topup.html">📱 Topup</a>
      <a class="menu-link" href="${REPO_BASE}/giftcards.html">🎁 Gift Cards</a>
      <a class="menu-link" href="${REPO_BASE}/netflix.html">🎬 Netflix</a>
      <a class="menu-link" href="${REPO_BASE}/primevideo.html">📺 Prime Video</a>
      <a class="menu-link" href="${REPO_BASE}/convert.html">🔄 Convert</a>
      <a class="menu-link" href="${REPO_BASE}/create-card.html">💳 Create Card</a>
      <a class="menu-link" href="${REPO_BASE}/cards.html">🏦 Cards</a>
      <a class="menu-link" href="${REPO_BASE}/statement.html">📄 Statement</a>
      <a class="menu-link" href="${REPO_BASE}/notification.html">🔔 Notifications</a>
      <a class="menu-link" href="${REPO_BASE}/wallet.html">👛 Wallet</a>
      <a class="menu-link" href="${REPO_BASE}/admin.html">🛠️ Admin</a>
    </div>
  `;
}

function bottomNavHtml(active = "") {
  return `
    <div class="bottom-nav">
      <a href="${REPO_BASE}/index.html" class="${active === "home" ? "active" : ""}">
        <span>🏠</span><span>Home</span>
      </a>
      <a href="${REPO_BASE}/transactions.html" class="${active === "transactions" ? "active" : ""}">
        <span>🔄</span><span>Transactions</span>
      </a>
      <a href="${REPO_BASE}/services.html" class="${active === "services" ? "active" : ""}">
        <span>🛠️</span><span>Services</span>
      </a>
      <a href="${REPO_BASE}/cards.html" class="${active === "cards" ? "active" : ""}">
        <span>💳</span><span>Cards</span>
      </a>
      <a href="${REPO_BASE}/wallet.html" class="${active === "wallet" ? "active" : ""}">
        <span>👛</span><span>Wallet</span>
      </a>
    </div>
  `;
}

function injectLayout(active = "") {
  const menuRoot = document.getElementById("menu-root");
  const navRoot = document.getElementById("nav-root");
  if (menuRoot) menuRoot.innerHTML = menuHtml();
  if (navRoot) navRoot.innerHTML = bottomNavHtml(active);
}
