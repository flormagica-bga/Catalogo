// Variables globales
let cart = [];
let currentFilter = "todos";

const cartIcon = document.getElementById("cartIcon");
const cartModal = document.getElementById("cartModal");
const closeCart = document.getElementById("closeCart");
const cartCount = document.getElementById("cartCount");
const cartItems = document.getElementById("cartItems");
const sendWhatsApp = document.getElementById("sendWhatsApp");
const filterButtonsContainer = document.querySelector(".filter-buttons");
const productsGrid = document.getElementById("productsGrid");

// Numero de WhatsApp (CAMBIAR POR EL NUMERO REAL)
const whatsappNumber = "573112936580"; // Formato: 57 + numero sin espacios
const defaultCategories = [
  { value: "collares", label: "Collares" },
  { value: "aretes", label: "Aretes" },
  { value: "anillos", label: "Anillos" },
  { value: "conjuntos", label: "Conjuntos" },
];
let categories = [];

function normalizeBoolean(value) {
  return value === true || value === "true";
}

function slugifyCategoryValue(value) {
  return String(value || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatCategoryLabel(value) {
  return String(value || "")
    .trim()
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function normalizeCategoryItem(item) {
  if (!item) {
    return null;
  }

  if (typeof item === "string") {
    const value = slugifyCategoryValue(item);
    if (!value) {
      return null;
    }
    return {
      value,
      label: formatCategoryLabel(item) || formatCategoryLabel(value),
    };
  }

  const rawValue = item.value || item.slug || item.id || item.category || item.name || item.label;
  const value = slugifyCategoryValue(rawValue);
  if (!value) {
    return null;
  }

  return {
    value,
    label:
      String(item.label || item.name || formatCategoryLabel(value)).trim() ||
      formatCategoryLabel(value),
  };
}

function normalizeCategories(categoryData, productData) {
  const map = new Map();
  const ordered = [];

  const addCategory = (item) => {
    const normalized = normalizeCategoryItem(item);
    if (!normalized || map.has(normalized.value)) {
      if (normalized && map.has(normalized.value) && normalized.label) {
        map.get(normalized.value).label = normalized.label;
      }
      return;
    }

    map.set(normalized.value, normalized);
    ordered.push(normalized);
  };

  defaultCategories.forEach(addCategory);
  if (Array.isArray(categoryData)) {
    categoryData.forEach(addCategory);
  }

  if (Array.isArray(productData)) {
    productData.forEach((product) => addCategory(product?.category));
  }

  return ordered;
}

function getCategoryLabel(value) {
  const normalizedValue = slugifyCategoryValue(value);
  const category = categories.find((item) => item.value === normalizedValue);
  return category?.label || formatCategoryLabel(normalizedValue) || value;
}

function updateCartCount() {
  cartCount.textContent = cart.length;
  cartCount.style.display = cart.length > 0 ? "flex" : "none";
}

function addToCart(productId) {
  const productCard = document.querySelector(`[data-id="${productId}"]`);
  if (!productCard) {
    return;
  }

  if (productCard.getAttribute("data-agotado") === "true") {
    alert("Este producto esta agotado por ahora 🌸");
    return;
  }

  const productName = productCard.querySelector(".product-name").textContent;
  const productPrice = productCard.querySelector(".product-price").textContent;
  const productCategory = productCard.getAttribute("data-category");
  const productReference = String(
    productCard.getAttribute("data-reference") || "",
  ).trim();

  const existingProduct = cart.find((item) => item.id === productId);

  if (existingProduct) {
    alert("Este producto ya esta en tu carrito 🛍️");
    return;
  }

  const product = {
    id: productId,
    name: productName,
    reference: productReference,
    price: productPrice,
    category: productCategory,
    link: getProductLink(productId),
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
  return getCategoryLabel(category);
}

function getProductReference(product) {
  return String(product?.reference ?? product?.referencia ?? "").trim();
}

function getProductAnchorId(productId) {
  return `producto-${String(productId || "").trim()}`;
}

function getProductLink(productId) {
  const productUrl = new URL(window.location.href);
  productUrl.hash = getProductAnchorId(productId);
  return productUrl.toString();
}

function generateWhatsAppMessage() {
  if (cart.length === 0) {
    alert("Tu carrito esta vacio. Agrega productos antes de consultar.");
    return;
  }

  const intro =
    cart.length === 1
      ? "Hola, quiero consultar por este producto:"
      : "Hola, quiero consultar por estos productos:";

  const blocks = cart.map((item) => {
    const lines = [`Nombre: ${item.name}`];

    if (item.reference) {
      lines.push(`Referencia: ${item.reference}`);
    }

    lines.push(`Categoria: ${getCategoryName(item.category)}`);
    lines.push(`Precio: ${item.price}`);

    if (item.link) {
      lines.push(`Link: ${item.link}`);
    }

    return lines.join("\n");
  });

  const closing =
    cart.length === 1
      ? "Quiero conocer mas detalles y disponibilidad."
      : "Quiero conocer mas detalles y disponibilidad de estos productos.";

  const message = `${intro}\n\n${blocks.join("\n\n")}\n\n${closing}`;

  const encodedMessage = encodeURIComponent(message);
  const whatsappURL = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
  window.open(whatsappURL, "_blank");
}

function renderFilterButtons() {
  if (!filterButtonsContainer) {
    return;
  }

  filterButtonsContainer.innerHTML = "";

  const filters = [{ value: "todos", label: "Todos" }, ...categories];
  filters.forEach((filter) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "filter-btn";
    button.setAttribute("data-category", filter.value);
    button.textContent = filter.label;
    button.classList.toggle("active", currentFilter === filter.value);
    filterButtonsContainer.appendChild(button);
  });
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

  if (filterButtonsContainer) {
    filterButtonsContainer.querySelectorAll(".filter-btn").forEach((button) => {
      button.classList.toggle(
        "active",
        button.getAttribute("data-category") === currentFilter,
      );
    });
  }
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
  const isOutOfStock = normalizeBoolean(product.agotado);
  const categoryValue = slugifyCategoryValue(product.category) || "collares";
  const reference = getProductReference(product);
  const card = document.createElement("div");
  card.className = "product-card";
  card.id = getProductAnchorId(product.id);
  card.setAttribute("data-category", categoryValue);
  card.setAttribute("data-id", product.id || "");
  card.setAttribute("data-agotado", isOutOfStock ? "true" : "false");
  card.setAttribute("data-reference", reference);
  card.classList.toggle("is-out-of-stock", isOutOfStock);

  card.innerHTML = `
    <div class="product-image">
      ${isOutOfStock ? '<span class="product-badge">Agotado</span>' : ""}
      <img src="${product.image}" alt="${product.alt || product.name}" />
    </div>
    <div class="product-info">
      <h3 class="product-name">${product.name}</h3>
      <p class="product-description">${product.description}</p>
      <p class="product-price">${product.price}</p>
      ${isOutOfStock ? '<p class="product-stock-status">Producto agotado</p>' : ""}
      <button class="add-to-cart"${isOutOfStock ? " disabled" : ""}>${isOutOfStock ? "Agotado" : "Agregar al Carrito"}</button>
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
    categories = normalizeCategories(window.CATEGORIAS, window.CATALOGO);
    if (
      currentFilter !== "todos" &&
      !categories.some((category) => category.value === currentFilter)
    ) {
      currentFilter = "todos";
    }
    renderFilterButtons();
    renderProducts(window.CATALOGO);
    return;
  }

  categories = normalizeCategories(window.CATEGORIAS, []);
  renderFilterButtons();
  showEmptyCatalogMessage();
}

if (filterButtonsContainer) {
  filterButtonsContainer.addEventListener("click", (event) => {
    const button = event.target.closest(".filter-btn");
    if (!button) {
      return;
    }

    const selectedCategory = button.getAttribute("data-category");
    applyFilter(selectedCategory);
  });
}

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
});
