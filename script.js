// Variables globales
let cart = [];
const cartIcon = document.getElementById("cartIcon");
const cartModal = document.getElementById("cartModal");
const closeCart = document.getElementById("closeCart");
const cartCount = document.getElementById("cartCount");
const cartItems = document.getElementById("cartItems");
const sendWhatsApp = document.getElementById("sendWhatsApp");
const filterButtons = document.querySelectorAll(".filter-btn");
const productCards = document.querySelectorAll(".product-card");

// Número de WhatsApp
const whatsappNumber = "573112936580";

// Función para limpiar texto (elimina saltos de línea y espacios extras)
function cleanText(text) {
  return text
    .replace(/\s+/g, ' ')  // Reemplaza múltiples espacios/tabs/saltos por un solo espacio
    .trim();  // Elimina espacios al inicio y final
}

// Función para actualizar el contador del carrito
function updateCartCount() {
  cartCount.textContent = cart.length;

  if (cart.length > 0) {
    cartCount.style.display = "flex";
  } else {
    cartCount.style.display = "none";
  }
}

// Función para agregar producto al carrito
function addToCart(productId) {
  const productCard = document.querySelector(`[data-id="${productId}"]`);
  const productName = cleanText(productCard.querySelector(".product-name").textContent);
  const productPrice = cleanText(productCard.querySelector(".product-price").textContent);
  const productCategory = productCard.getAttribute("data-category");

  // Verificar si el producto ya está en el carrito
  const existingProduct = cart.find((item) => item.id === productId);

  if (existingProduct) {
    alert("Este producto ya está en tu carrito 🛍️");
    return;
  }

  // Agregar producto al carrito
  const product = {
    id: productId,
    name: productName,
    price: productPrice,
    category: productCategory,
  };

  cart.push(product);
  updateCartCount();
  updateCartDisplay();

  // Feedback visual
  const button = productCard.querySelector(".add-to-cart");
  const originalText = button.textContent;
  button.textContent = "✓ Agregado";
  button.style.background = "#4CAF50";

  setTimeout(() => {
    button.textContent = originalText;
    button.style.background = "";
  }, 1500);
}

// Función para remover producto del carrito
function removeFromCart(productId) {
  cart = cart.filter((item) => item.id !== productId);
  updateCartCount();
  updateCartDisplay();
}

// Función para actualizar la visualización del carrito
function updateCartDisplay() {
  if (cart.length === 0) {
    cartItems.innerHTML =
      '<div class="cart-empty">Tu carrito está vacío 🌸<br>Agrega algunos productos hermosos</div>';
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

// Función para obtener el nombre de la categoría en español
function getCategoryName(category) {
  const categories = {
    collares: "Collar",
    aretes: "Aretes",
    anillos: "Anillo",
    conjuntos: "Conjunto",
  };
  return categories[category] || category;
}

// Función para generar mensaje de WhatsApp
function generateWhatsAppMessage() {
  if (cart.length === 0) {
    alert("Tu carrito está vacío. Agrega productos antes de consultar 🌸");
    return;
  }

  let message = "¡Hola! 🌸 Me interesan los siguientes productos de Flor Mágica:\n\n";

  cart.forEach((item, index) => {
    message += `${index + 1}. ${item.name}\n`;
    message += `Categoría: ${getCategoryName(item.category)}\n`;
    message += `Precio: ${item.price}\n\n`;
  });

  message += "¿Están disponibles estos productos? Me gustaría conocer más detalles. ✨";

  // Codificar el mensaje para URL
  const encodedMessage = encodeURIComponent(message);

  // Abrir WhatsApp
  const whatsappURL = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
  window.open(whatsappURL, "_blank");
}

// Event Listeners para filtros
filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    // Remover clase active de todos los botones
    filterButtons.forEach((btn) => btn.classList.remove("active"));

    // Agregar clase active al botón clickeado
    button.classList.add("active");

    // Obtener categoría seleccionada
    const selectedCategory = button.getAttribute("data-category");

    // Filtrar productos
    productCards.forEach((card) => {
      const cardCategory = card.getAttribute("data-category");

      if (selectedCategory === "todos" || cardCategory === selectedCategory) {
        card.classList.remove("hidden");
        card.style.display = "block";
      } else {
        card.classList.add("hidden");
        card.style.display = "none";
      }
    });
  });
});

// Event Listeners para botones de agregar al carrito
document.querySelectorAll(".add-to-cart").forEach((button) => {
  button.addEventListener("click", (e) => {
    const productCard = e.target.closest(".product-card");
    const productId = productCard.getAttribute("data-id");
    addToCart(productId);
  });
});

// Event Listeners para el modal del carrito
cartIcon.addEventListener("click", () => {
  cartModal.classList.add("active");
  updateCartDisplay();
});

closeCart.addEventListener("click", () => {
  cartModal.classList.remove("active");
});

// Cerrar modal al hacer click fuera de él
cartModal.addEventListener("click", (e) => {
  if (e.target === cartModal) {
    cartModal.classList.remove("active");
  }
});

// Event Listener para botón de WhatsApp
sendWhatsApp.addEventListener("click", generateWhatsAppMessage);

// Cerrar modal con tecla Escape
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && cartModal.classList.contains("active")) {
    cartModal.classList.remove("active");
  }
});

// Animación suave al cargar productos
window.addEventListener("load", () => {
  productCards.forEach((card, index) => {
    setTimeout(() => {
      card.style.opacity = "1";
    }, index * 50);
  });
});

// Inicializar
updateCartCount();
