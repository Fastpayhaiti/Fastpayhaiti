const REPO = "/Fastpayhaiti";

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

function loadPageNav(active = "") {
  const navRoot = document.getElementById("nav-root");
  if (navRoot) navRoot.innerHTML = nav(active);
}
