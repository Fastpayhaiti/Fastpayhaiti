const REPO = "/Fastpayhaiti";

function openMenu() {
  const menu = document.getElementById("menu");
  const overlay = document.getElementById("overlay");
  if (menu) menu.classList.add("open");
  if (overlay) overlay.classList.add("show");
}

function closeMenu() {
  const menu = document.getElementById("menu");
  const overlay = document.getElementById("overlay");
  if (menu) menu.classList.remove("open");
  if (overlay) overlay.classList.remove("show");
}

function menu() {
  return `
    <button class="menu-toggle-btn" onclick="openMenu()">☰</button>

    <div id="overlay" class="menu-overlay" onclick="closeMenu()"></div>

    <div id="menu" class="side-menu">
      <div class="menu-header">
        <div class="menu-title">FastPay Menu</div>
        <button class="close-btn" onclick="closeMenu()">✖</button>
      </div>

      <a class="menu-link" href="${REPO}/index.html">🏠 Home</a>
      <a class="menu-link" href="${REPO}/deposit.html">💰 Deposit</a>
      <a class="menu-link" href="${REPO}/withdraw.html">💸 Withdraw</a>
      <a class="menu-link" href="${REPO}/send.html">📩 Send</a>
      <a class="menu-link" href="${REPO}/topup.html">📱 Topup</a>
      <a class="menu-link" href="${REPO}/giftcards.html">🎁 Gift Cards</a>
      <a class="menu-link" href="${REPO}/netflix.html">🎬 Netflix</a>
      <a class="menu-link" href="${REPO}/primevideo.html">📺 Prime Video</a>
      <a class="menu-link" href="${REPO}/convert.html">🔄 Convert</a>
      <a class="menu-link" href="${REPO}/create-card.html">💳 Create Card</a>
      <a class="menu-link" href="${REPO}/cards.html">🏦 Cards</a>
      <a class="menu-link" href="${REPO}/statement.html">📄 Statement</a>
      <a class="menu-link" href="${REPO}/notification.html">🔔 Notifications</a>
      <a class="menu-link" href="${REPO}/wallet.html">👛 Wallet</a>
      <a class="menu-link" href="${REPO}/admin.html">🛠️ Admin</a>
    </div>
  `;
}

function nav(active = "") {
  return `
    <div class="bottom-nav">
      <a href="${REPO}/index.html" class="${active === "home" ? "active" : ""}">🏠<span>Home</span></a>
      <a href="${REPO}/transactions.html" class="${active === "transactions" ? "active" : ""}">🔄<span>Transactions</span></a>
      <a href="${REPO}/services.html" class="${active === "services" ? "active" : ""}">🛠️<span>Services</span></a>
      <a href="${REPO}/cards.html" class="${active === "cards" ? "active" : ""}">💳<span>Cards</span></a>
      <a href="${REPO}/wallet.html" class="${active === "wallet" ? "active" : ""}">👛<span>Wallet</span></a>
    </div>
  `;
}

function loadDashboardLayout(active = "home") {
  const menuRoot = document.getElementById("menu-root");
  const navRoot = document.getElementById("nav-root");

  if (menuRoot) menuRoot.innerHTML = menu();
  if (navRoot) navRoot.innerHTML = nav(active);
}

function loadPageNav(active = "") {
  const navRoot = document.getElementById("nav-root");
  if (navRoot) navRoot.innerHTML = nav(active);
}
