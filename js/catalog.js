// Variables globales
let cart = [];
let currentFilter = "todos";

const cartIcon = document.getElementById("cartIcon");
const cartModal = document.getElementById("cartModal");
const closeCart = document.getElementById("closeCart");
const cartCount = document.getElementById("cartCount");
const cartItems = document.getElementById("cartItems");
const sendWhatsApp = document.getElementById("sendWhatsApp");
const filterButtons = document.querySelectorAll(".filter-btn");
const productsGrid = document.getElementById("productsGrid");
const promoOverlay = document.getElementById("promoOverlay");
const promoClose = document.getElementById("promoClose");

// Numero de WhatsApp (CAMBIAR POR EL NUMERO REAL)
const whatsappNumber = "573112936580"; // Formato: 57 + numero sin espacios

function updateCartCount() {
  cartCount.textContent = cart.length;
  cartCount.style.display = cart.length > 0 ? "flex" : "none";
}

function addToCart(productId) {
  const productCard = document.querySelector(`[data-id="${productId}"]`);
  if (!productCard) {
    return;
  }

  const productName = productCard.querySelector(".product-name").textContent;
  const productPrice = productCard.querySelector(".product-price").textContent;
  const productCategory = productCard.getAttribute("data-category");

  const existingProduct = cart.find((item) => item.id === productId);

  if (existingProduct) {
    alert("Este producto ya esta en tu carrito 🛍️");
    return;
  }

  const product = {
    id: productId,
    name: productName,
    price: productPrice,
    category: productCategory,
  };

  cart.push(product);
  updateCartCount();
  updateCartDisplay();

  const button = productCard.querySelector(".add-to-cart");
  if (button) {
    const originalText = button.textContent;
    button.textContent = "✓ Agregado";
    button.style.background = "#4CAF50";

    setTimeout(() => {
      button.textContent = originalText;
      button.style.background = "";
    }, 1500);
  }
}

function removeFromCart(productId) {
  cart = cart.filter((item) => item.id !== productId);
  updateCartCount();
  updateCartDisplay();
}

function updateCartDisplay() {
  if (cart.length === 0) {
    cartItems.innerHTML =
      '<div class="cart-empty">Tu carrito esta vacio 🌸<br>Agrega algunos productos hermosos</div>';
    return;
  }

  let cartHTML = "";

  cart.forEach((item) => {
    cartHTML += `
      <div class="cart-item">
        <div class="cart-item-info">
          <h4>${item.name}</h4>
          <p>${getCategoryName(item.category)}</p>
        </div>
        <div>
          <div class="cart-item-price">${item.price}</div>
          <button class="remove-item" onclick="removeFromCart('${item.id}')">🗑️</button>
        </div>
      </div>
    `;
  });

  cartItems.innerHTML = cartHTML;
}

function getCategoryName(category) {
  const categories = {
    collares: "Collar",
    aretes: "Aretes",
    anillos: "Anillo",
    conjuntos: "Conjunto",
  };
  return categories[category] || category;
}

function generateWhatsAppMessage() {
  if (cart.length === 0) {
    alert("Tu carrito esta vacio. Agrega productos antes de consultar 🌸");
    return;
  }

  let message =
    "¡Hola! 🌸 Me interesan los siguientes productos de Flor Magica:\n\n";

  cart.forEach((item, index) => {
    message += `${index + 1}. ${item.name}\n`;
    message += `   Categoria: ${getCategoryName(item.category)}\n`;
    message += `   Precio: ${item.price}\n\n`;
  });
  message +=
    "¿Estan disponibles estos productos? Me gustaria conocer mas detalles. ✨";

  const encodedMessage = encodeURIComponent(message);
  const whatsappURL = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
  window.open(whatsappURL, "_blank");
}

function applyFilter(category) {
  currentFilter = category;
  const cards = Array.from(productsGrid.querySelectorAll(".product-card"));

  cards.forEach((card) => {
    const cardCategory = card.getAttribute("data-category");

    if (category === "todos" || cardCategory === category) {
      card.classList.remove("hidden");
      card.style.display = "block";
    } else {
      card.classList.add("hidden");
      card.style.display = "none";
    }
  });
}

function animateCards() {
  const cards = Array.from(productsGrid.querySelectorAll(".product-card"));
  cards.forEach((card, index) => {
    setTimeout(() => {
      card.style.opacity = "1";
    }, index * 50);
  });
}

function createProductCard(product) {
  const card = document.createElement("div");
  card.className = "product-card";
  card.setAttribute("data-category", product.category || "collares");
  card.setAttribute("data-id", product.id || "");

  card.innerHTML = `
    <div class="product-image">
      <img src="${product.image}" alt="${product.alt || product.name}" />
    </div>
    <div class="product-info">
      <h3 class="product-name">${product.name}</h3>
      <p class="product-description">${product.description}</p>
      <p class="product-price">${product.price}</p>
      <button class="add-to-cart">Agregar al Carrito</button>
    </div>
  `;

  return card;
}

function renderProducts(products) {
  if (!Array.isArray(products) || products.length === 0) {
    showEmptyCatalogMessage();
    return;
  }

  productsGrid.innerHTML = "";

  products.forEach((product) => {
    const card = createProductCard(product);
    productsGrid.appendChild(card);
  });

  applyFilter(currentFilter);
  animateCards();
}

function showEmptyCatalogMessage() {
  productsGrid.innerHTML =
    '<div class="product-empty">No hay productos. Reemplaza data/catalogo.js.</div>';
}

function loadCatalogFromData() {
  if (Array.isArray(window.CATALOGO) && window.CATALOGO.length > 0) {
    renderProducts(window.CATALOGO);
    return;
  }

  showEmptyCatalogMessage();
}

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    filterButtons.forEach((btn) => btn.classList.remove("active"));
    button.classList.add("active");
    const selectedCategory = button.getAttribute("data-category");
    applyFilter(selectedCategory);
  });
});

productsGrid.addEventListener("click", (event) => {
  const button = event.target.closest(".add-to-cart");
  if (!button) {
    return;
  }

  const productCard = button.closest(".product-card");
  if (!productCard) {
    return;
  }

  const productId = productCard.getAttribute("data-id");
  addToCart(productId);
});

cartIcon.addEventListener("click", () => {
  cartModal.classList.add("active");
  updateCartDisplay();
});

closeCart.addEventListener("click", () => {
  cartModal.classList.remove("active");
});

cartModal.addEventListener("click", (e) => {
  if (e.target === cartModal) {
    cartModal.classList.remove("active");
  }
});

sendWhatsApp.addEventListener("click", generateWhatsAppMessage);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && cartModal.classList.contains("active")) {
    cartModal.classList.remove("active");
  }
});

window.addEventListener("load", () => {
  loadCatalogFromData();
  updateCartCount();
  if (promoOverlay && promoClose) {
    promoClose.addEventListener("click", () => {
      promoOverlay.classList.add("hidden");
      setTimeout(() => {
        promoOverlay.setAttribute("aria-hidden", "true");
      }, 180);
    });
  }
});
