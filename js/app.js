function nav(active = "") {
  return `
    <div class="bottom-nav">
      <a href="./dashboard.html" class="${active === "home" ? "active" : ""}">
        🏠<span>Home</span>
      </a>

      <a href="./transactions.html" class="${active === "transactions" ? "active" : ""}">
        🔄<span>Transactions</span>
      </a>

      <a href="./services.html" class="${active === "services" ? "active" : ""}">
        ₿<span>Services</span>
      </a>

      <a href="./cards.html" class="${active === "cards" ? "active" : ""}">
        💳<span>Cards</span>
      </a>

      <a href="./wallet.html" class="${active === "wallet" ? "active" : ""}">
        👛<span>Wallet</span>
      </a>
    </div>
  `;
}

function loadPageNav(active = "") {
  const navRoot = document.getElementById("nav-root");
  if (navRoot) navRoot.innerHTML = nav(active);
}

function openMenu() {
  const menu = document.getElementById("sideMenu");
  const overlay = document.getElementById("menuOverlay");
  if (menu) menu.classList.add("open");
  if (overlay) overlay.classList.add("show");
}

function closeMenu() {
  const menu = document.getElementById("sideMenu");
  const overlay = document.getElementById("menuOverlay");
  if (menu) menu.classList.remove("open");
  if (overlay) overlay.classList.remove("show");
}

function loadMenu() {
  const menuRoot = document.getElementById("menu-root");
  if (!menuRoot) return;

  menuRoot.innerHTML = `
    <div class="menu-overlay" id="menuOverlay" onclick="closeMenu()"></div>

    <div class="side-menu" id="sideMenu">
      <div class="menu-header">
        <div class="menu-title">FastPay Menu</div>
        <button class="close-btn" onclick="closeMenu()">✖</button>
      </div>

      <a class="menu-link" href="./topup.html">📱 Topup</a>
      <a class="menu-link" href="./giftcards.html">🎁 Giftcards</a>
      <a class="menu-link" href="./netflix.html">🎬 Netflix</a>
      <a class="menu-link" href="./primevideo.html">📺 Prime Video</a>
      <a class="menu-link" href="./freefire.html">🔥 Free Fire</a>
    </div>
  `;
}
