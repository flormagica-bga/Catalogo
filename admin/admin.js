const adminStatus = document.getElementById("adminStatus");
const saveCatalogButton = document.getElementById("saveCatalog");
const exportCatalogButton = document.getElementById("exportCatalog");
const importCatalogInput = document.getElementById("importCatalog");
const adminStats = document.getElementById("adminStats");
const adminValidation = document.getElementById("adminValidation");
const adminAddForm = document.getElementById("adminAddForm");
const adminList = document.getElementById("adminList");
const adminCount = document.getElementById("adminCount");
const adminCategorySelect = document.getElementById("adminCategory");
const adminReferenceInput = document.getElementById("adminReference");
const adminCategoryForm = document.getElementById("adminCategoryForm");
const adminCategoryName = document.getElementById("adminCategoryName");
const adminCategoryList = document.getElementById("adminCategoryList");
const adminSearchInput = document.getElementById("adminSearchReference");
const adminImageFile = document.getElementById("adminImageFile");
const adminImagePreview = document.getElementById("adminImagePreview");
const adminImagePreviewImg = document.getElementById("adminImagePreviewImg");
const adminAddButton = document.getElementById("adminAddButton");

let products = [];
let categories = [];
let nextProductId = 1;
let pendingImageFile = null;
let pendingImageUrl = "";
let catalogFileHandle = null;

const pricePattern = /^\$\d{1,3}(\.\d{3})*$/;
const imagePattern = /^productos\/.+\.(png|jpe?g|webp)$/i;
const defaultCategories = [
  { value: "collares", label: "Collares" },
  { value: "aretes", label: "Aretes" },
  { value: "anillos", label: "Anillos" },
  { value: "conjuntos", label: "Conjuntos" },
];
const defaultReferencePrefixes = {
  collares: "CP",
  aretes: "AP",
  anillos: "NP",
  conjuntos: "JP",
  pinzas: "PP",
};

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

  const rawValue =
    item.value ||
    item.slug ||
    item.id ||
    item.category ||
    item.name ||
    item.label;
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
    productData.forEach((product) => {
      addCategory(product?.category);
    });
  }

  return ordered;
}

function getCategoryLabel(value) {
  const normalizedValue = slugifyCategoryValue(value);
  const category = categories.find((item) => item.value === normalizedValue);
  return category?.label || formatCategoryLabel(normalizedValue) || value;
}

function getDefaultCategoryValue() {
  const defaultCategory = categories.find((item) => item.value === "collares");
  return defaultCategory?.value || categories[0]?.value || "collares";
}

function setStatus(message, type) {
  adminStatus.textContent = message;
  adminStatus.style.color = type === "error" ? "#b31243" : "";
}

function normalizeProducts(data) {
  if (!Array.isArray(data)) {
    return [];
  }

  return data
    .map((item, index) => {
      const id =
        typeof item.id === "string" || typeof item.id === "number"
          ? String(item.id)
          : String(index + 1);

      return {
        id,
        category: slugifyCategoryValue(item.category) || "collares",
        name: item.name || "",
        reference: String(item.reference ?? item.referencia ?? "").trim(),
        description: item.description || "",
        price: item.price || "",
        image: item.image || "",
        alt: item.alt || item.name || "",
        agotado: normalizeBoolean(item.agotado),
      };
    })
    .filter((item) => item.name && item.image);
}

function updateNextId() {
  const numericIds = products
    .map((product) => Number(product.id))
    .filter((value) => !Number.isNaN(value));
  nextProductId = numericIds.length ? Math.max(...numericIds) + 1 : 1;
}

function getReferenceValue(product) {
  return String(product?.reference ?? product?.referencia ?? "").trim();
}

function getReferencePrefix(category) {
  const normalizedCategory = slugifyCategoryValue(category);
  const categoryProducts = products.filter(
    (product) => slugifyCategoryValue(product.category) === normalizedCategory,
  );

  for (const product of categoryProducts) {
    const match = getReferenceValue(product).match(/^([A-Za-z]+)\d+$/);
    if (match) {
      return match[1].toUpperCase();
    }
  }

  return defaultReferencePrefixes[normalizedCategory] || "REF";
}

function getSuggestedReference(category) {
  const normalizedCategory = slugifyCategoryValue(category);
  const prefix = getReferencePrefix(normalizedCategory);
  const categoryProducts = products.filter(
    (product) => slugifyCategoryValue(product.category) === normalizedCategory,
  );

  let maxNumber = 0;

  categoryProducts.forEach((product) => {
    const match = getReferenceValue(product).match(/^([A-Za-z]+)(\d+)$/);
    if (!match) {
      return;
    }

    if (match[1].toUpperCase() !== prefix) {
      return;
    }

    maxNumber = Math.max(maxNumber, Number(match[2]));
  });

  return `${prefix}${String(maxNumber + 1).padStart(2, "0")}`;
}

function updateSuggestedReference(force) {
  if (!adminReferenceInput || !adminCategorySelect) {
    return;
  }

  const suggestedReference = getSuggestedReference(adminCategorySelect.value);
  const currentValue = String(adminReferenceInput.value || "").trim();
  const lastSuggested = adminReferenceInput.dataset.lastSuggested || "";
  const shouldReplace =
    force || !currentValue || currentValue === lastSuggested;

  adminReferenceInput.placeholder = suggestedReference;
  adminReferenceInput.dataset.lastSuggested = suggestedReference;

  if (shouldReplace) {
    adminReferenceInput.value = suggestedReference;
  }
}

let currentSearchReference = "";

function getFilteredProducts() {
  const query = String(currentSearchReference || "")
    .trim()
    .toLowerCase();
  if (!query) {
    return products;
  }

  return products.filter((product) =>
    String(product.reference || "")
      .toLowerCase()
      .includes(query),
  );
}

function updateSearchResults() {
  if (!adminSearchInput) {
    return;
  }

  currentSearchReference = String(adminSearchInput.value || "").trim();
  renderList();
}

function formatPrice(value) {
  const numeric = String(value || "").replace(/[^0-9]/g, "");
  if (!numeric) {
    return "";
  }
  return `$${Number(numeric).toLocaleString("es-CO")}`;
}

function getAdminImagePath(path) {
  const trimmed = String(path || "").trim();
  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith("productos/")) {
    return `../${trimmed}`;
  }

  return trimmed;
}

function getImagePathFromFile(category, file) {
  const rawName = String(file?.name || "").trim();
  const cleanName = rawName.split(/[\\/]/).pop();
  if (!cleanName) {
    return "";
  }

  return `productos/${category}/${cleanName}`;
}

function setAddImagePreviewFromFile() {
  if (!adminImagePreview || !adminImagePreviewImg) {
    return;
  }

  if (!pendingImageFile) {
    adminImagePreview.classList.add("empty");
    adminImagePreviewImg.src = "";
    return;
  }

  if (pendingImageUrl) {
    URL.revokeObjectURL(pendingImageUrl);
  }

  pendingImageUrl = URL.createObjectURL(pendingImageFile);
  adminImagePreviewImg.src = pendingImageUrl;
  adminImagePreview.classList.remove("empty");
}

function resetPendingImage() {
  pendingImageFile = null;
  if (pendingImageUrl) {
    URL.revokeObjectURL(pendingImageUrl);
    pendingImageUrl = "";
  }
  if (adminImagePreview) {
    adminImagePreview.classList.add("empty");
  }
  if (adminImagePreviewImg) {
    adminImagePreviewImg.src = "";
  }
}

function renderStats() {
  adminStats.innerHTML = "";
  const total = products.length;
  const counts = products.reduce((acc, product) => {
    acc[product.category] = (acc[product.category] || 0) + 1;
    return acc;
  }, {});

  const stats = [
    { label: "Total", value: total },
    ...categories.map((category) => ({
      label: category.label,
      value: counts[category.value] || 0,
    })),
  ];

  stats.forEach((stat) => {
    const card = document.createElement("div");
    card.className = "admin-stat";

    const value = document.createElement("strong");
    value.textContent = stat.value;

    const label = document.createElement("span");
    label.textContent = stat.label;

    card.appendChild(value);
    card.appendChild(label);
    adminStats.appendChild(card);
  });
}

function renderValidation() {
  adminValidation.innerHTML = "";
  const issues = [];

  products.forEach((product) => {
    if (!pricePattern.test(product.price)) {
      issues.push(`Precio invalido en ${product.name}.`);
    }
    if (!imagePattern.test(product.image)) {
      issues.push(`Imagen invalida en ${product.name}.`);
    }
  });

  if (issues.length === 0) {
    adminValidation.textContent = "Validaciones correctas.";
    adminValidation.style.color = "#2e7d32";
    return;
  }

  adminValidation.style.color = "#b31243";
  issues.slice(0, 4).forEach((issue) => {
    const item = document.createElement("div");
    item.textContent = issue;
    adminValidation.appendChild(item);
  });
}

function createField(labelText, inputElement) {
  const wrapper = document.createElement("div");
  wrapper.className = "admin-field";

  const label = document.createElement("label");
  label.textContent = labelText;

  wrapper.appendChild(label);
  wrapper.appendChild(inputElement);
  return wrapper;
}

function createCheckboxField(labelText, inputElement) {
  const wrapper = document.createElement("div");
  wrapper.className = "admin-field admin-checkbox-field";

  const label = document.createElement("label");
  label.className = "admin-checkbox";

  const text = document.createElement("span");
  text.textContent = labelText;

  label.appendChild(inputElement);
  label.appendChild(text);
  wrapper.appendChild(label);
  return wrapper;
}

function renderCategoryOptions(selectElement, selectedValue) {
  if (!selectElement) {
    return;
  }

  const currentValue =
    slugifyCategoryValue(selectedValue) || getDefaultCategoryValue();
  selectElement.innerHTML = "";

  categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category.value;
    option.textContent = category.label;
    option.selected = category.value === currentValue;
    selectElement.appendChild(option);
  });

  if (!selectElement.value && categories.length > 0) {
    selectElement.value = currentValue;
  }
}

function renderCategoryList() {
  if (!adminCategoryList) {
    return;
  }

  adminCategoryList.innerHTML = "";

  categories.forEach((category) => {
    const item = document.createElement("span");
    item.className = "admin-category-tag";
    item.textContent = `${category.label} (${category.value})`;
    adminCategoryList.appendChild(item);
  });
}

function renderList() {
  const filteredProducts = getFilteredProducts();

  adminList.innerHTML = "";
  adminCount.textContent = `${filteredProducts.length} productos`;

  if (filteredProducts.length === 0) {
    const empty = document.createElement("p");
    empty.className = "admin-hint";
    empty.textContent = products.length
      ? "No se encontraron productos con esa referencia."
      : "No hay productos cargados.";
    adminList.appendChild(empty);
    return;
  }

  filteredProducts.forEach((product) => {
    const card = document.createElement("div");
    card.className = "product-card admin-product-card";

    const imageWrap = document.createElement("div");
    imageWrap.className = "product-image";
    const image = document.createElement("img");
    image.src = getAdminImagePath(product.image);
    image.alt = product.alt || product.name;
    imageWrap.appendChild(image);

    const stockBadge = document.createElement("span");
    stockBadge.className = "product-badge";
    stockBadge.textContent = "Agotado";
    stockBadge.hidden = !product.agotado;
    imageWrap.appendChild(stockBadge);

    const info = document.createElement("div");
    info.className = "product-info";

    const nameText = document.createElement("h3");
    nameText.className = "product-name";
    nameText.textContent = product.name;

    const descriptionText = document.createElement("p");
    descriptionText.className = "product-description";
    descriptionText.textContent = product.description;

    const priceText = document.createElement("p");
    priceText.className = "product-price";
    priceText.textContent = product.price;

    const stockText = document.createElement("p");
    stockText.className = "product-stock-status";

    const updateStockState = () => {
      const isOutOfStock = normalizeBoolean(product.agotado);
      product.agotado = isOutOfStock;
      card.classList.toggle("is-out-of-stock", isOutOfStock);
      stockBadge.hidden = !isOutOfStock;
      stockText.hidden = !isOutOfStock;
      stockText.textContent = "Producto agotado";
    };

    const actions = document.createElement("div");
    actions.className = "admin-card-actions";

    const toggleButton = document.createElement("button");
    toggleButton.type = "button";
    toggleButton.className = "admin-secondary admin-toggle";
    toggleButton.textContent = "Editar";

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "admin-remove";
    removeButton.textContent = "Eliminar";
    removeButton.addEventListener("click", () => {
      products = products.filter((item) => item.id !== product.id);
      renderStats();
      renderValidation();
      renderList();
      updateSuggestedReference(false);
      enableExports();
    });

    actions.appendChild(toggleButton);
    actions.appendChild(removeButton);

    const editPanel = document.createElement("div");
    editPanel.className = "admin-edit-panel";

    const categorySelect = document.createElement("select");
    renderCategoryOptions(categorySelect, product.category);

    categorySelect.addEventListener("change", () => {
      product.category = categorySelect.value;
      product.image = `productos/${product.category}/${product.image
        .split("/")
        .pop()}`;
      image.src = getAdminImagePath(product.image);
      imageInput.value = product.image;
      renderValidation();
      renderStats();
      updateSuggestedReference(false);
    });

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.value = product.name;
    nameInput.addEventListener("input", () => {
      product.name = nameInput.value.trim();
      nameText.textContent = product.name || "Sin nombre";
      if (!altInput.value.trim()) {
        image.alt = product.name || "Producto";
      }
      renderValidation();
    });

    const referenceInput = document.createElement("input");
    referenceInput.type = "text";
    referenceInput.value = product.reference || "";
    referenceInput.addEventListener("input", () => {
      product.reference = referenceInput.value.trim();
      updateSuggestedReference(false);
    });

    const descriptionInput = document.createElement("textarea");
    descriptionInput.rows = 2;
    descriptionInput.value = product.description;
    descriptionInput.addEventListener("input", () => {
      product.description = descriptionInput.value.trim();
      descriptionText.textContent = product.description;
    });

    const priceInput = document.createElement("input");
    priceInput.type = "text";
    priceInput.value = product.price;
    priceInput.addEventListener("blur", () => {
      const formatted = formatPrice(priceInput.value);
      if (formatted) {
        priceInput.value = formatted;
        product.price = formatted;
      }
      priceText.textContent = product.price;
      priceInput.classList.toggle("invalid", !pricePattern.test(product.price));
      renderValidation();
    });
    priceInput.classList.toggle("invalid", !pricePattern.test(product.price));

    const imageInput = document.createElement("input");
    imageInput.type = "text";
    imageInput.value = product.image;
    imageInput.readOnly = true;

    const imageFileLabel = document.createElement("label");
    imageFileLabel.className = "admin-file";
    const imageFileInput = document.createElement("input");
    imageFileInput.type = "file";
    imageFileInput.accept = "image/*";
    const imageFileText = document.createElement("span");
    imageFileText.textContent = "Cambiar imagen";
    imageFileLabel.appendChild(imageFileInput);
    imageFileLabel.appendChild(imageFileText);

    imageFileInput.addEventListener("change", () => {
      const file = imageFileInput.files[0];
      if (!file) {
        return;
      }
      const newPath = getImagePathFromFile(product.category, file);
      if (!newPath) {
        setStatus("No se pudo leer el nombre de la imagen.", "error");
        return;
      }
      product.image = newPath;
      imageInput.value = newPath;
      image.src = getAdminImagePath(newPath);
      renderValidation();
    });

    const altInput = document.createElement("input");
    altInput.type = "text";
    altInput.value = product.alt;
    altInput.addEventListener("input", () => {
      product.alt = altInput.value.trim();
      image.alt = product.alt || product.name;
    });

    const agotadoInput = document.createElement("input");
    agotadoInput.type = "checkbox";
    agotadoInput.checked = normalizeBoolean(product.agotado);
    agotadoInput.addEventListener("change", () => {
      product.agotado = agotadoInput.checked;
      updateStockState();
    });

    editPanel.appendChild(createField("Categoria", categorySelect));
    editPanel.appendChild(createField("Nombre", nameInput));
    editPanel.appendChild(createField("Referencia", referenceInput));
    editPanel.appendChild(createField("Descripcion", descriptionInput));
    editPanel.appendChild(createField("Precio", priceInput));
    const imageField = createField("Imagen", imageInput);
    imageField.appendChild(imageFileLabel);
    editPanel.appendChild(imageField);
    editPanel.appendChild(createField("Alt", altInput));
    editPanel.appendChild(
      createCheckboxField("Marcar como agotado", agotadoInput),
    );

    toggleButton.addEventListener("click", () => {
      const isOpen = editPanel.classList.toggle("open");
      toggleButton.textContent = isOpen ? "Cerrar" : "Editar";
    });

    updateStockState();
    info.appendChild(nameText);
    info.appendChild(descriptionText);
    info.appendChild(priceText);
    info.appendChild(stockText);
    info.appendChild(actions);
    info.appendChild(editPanel);

    card.appendChild(imageWrap);
    card.appendChild(info);
    adminList.appendChild(card);
  });
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function serializeCatalogFile() {
  return `window.CATEGORIAS = ${JSON.stringify(categories, null, 2)};\nwindow.CATALOGO = ${JSON.stringify(products, null, 2)};\n`;
}

function enableExports() {
  const hasCatalogData = products.length > 0 || categories.length > 0;
  exportCatalogButton.disabled = !hasCatalogData;
  if (saveCatalogButton) {
    saveCatalogButton.disabled = !hasCatalogData;
  }
}

function exportCatalog() {
  downloadFile(serializeCatalogFile(), "catalogo.js", "application/javascript");
  setStatus("Descargado catalogo.js. Reemplaza data/catalogo.js.");
}

async function saveCatalogToFile(fallbackToExport) {
  const data = serializeCatalogFile();

  if (!window.showSaveFilePicker) {
    if (fallbackToExport) {
      exportCatalog();
      setStatus(
        "Tu navegador no permite guardar directo. Se descargo catalogo.js.",
        "error",
      );
    }
    return false;
  }

  try {
    if (!catalogFileHandle) {
      catalogFileHandle = await window.showSaveFilePicker({
        suggestedName: "catalogo.js",
        types: [
          {
            description: "JavaScript",
            accept: { "application/javascript": [".js"] },
          },
        ],
      });
    }

    const writable = await catalogFileHandle.createWritable();
    await writable.write(data);
    await writable.close();
    setStatus("catalogo.js guardado. Revisa data/catalogo.js.");
    return true;
  } catch (error) {
    if (fallbackToExport) {
      exportCatalog();
      setStatus(
        "No se pudo guardar directo. Se descargo catalogo.js.",
        "error",
      );
    }
    return false;
  }
}

function applyCatalogData(productData, categoryData, statusMessage) {
  products = normalizeProducts(productData);
  categories = normalizeCategories(categoryData, products);
  updateNextId();
  renderCategoryOptions(adminCategorySelect, adminCategorySelect?.value);
  updateSuggestedReference(true);
  renderCategoryList();
  renderStats();
  renderValidation();
  renderList();
  enableExports();
  setStatus(statusMessage || "Catalogo cargado.");
}

function parseAssignedArray(content, variableName) {
  const pattern = new RegExp(
    `window\\.${variableName}\\s*=\\s*(\\[[\\s\\S]*?\\]);`,
    "m",
  );
  const match = content.match(pattern);
  if (!match) {
    return null;
  }

  try {
    return JSON.parse(match[1]);
  } catch (error) {
    return null;
  }
}

function parseCatalogoJs(content) {
  const productsData = parseAssignedArray(content, "CATALOGO");
  if (!Array.isArray(productsData)) {
    return null;
  }

  return {
    products: productsData,
    categories: parseAssignedArray(content, "CATEGORIAS"),
  };
}

function loadInitialCatalog() {
  if (Array.isArray(window.CATALOGO)) {
    applyCatalogData(window.CATALOGO, window.CATEGORIAS, "Catalogo cargado.");
    return;
  }

  products = [];
  categories = normalizeCategories(window.CATEGORIAS, products);
  renderCategoryOptions(adminCategorySelect, getDefaultCategoryValue());
  updateSuggestedReference(true);
  renderCategoryList();
  renderStats();
  renderValidation();
  renderList();
  enableExports();
  setStatus("No se encontro data/catalogo.js.", "error");
}

adminCategoryForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const rawName = String(adminCategoryName?.value || "").trim();
  const value = slugifyCategoryValue(rawName);
  const label = formatCategoryLabel(rawName);

  if (!value || !label) {
    setStatus("Escribe un nombre valido para la categoria.", "error");
    return;
  }

  if (categories.some((category) => category.value === value)) {
    setStatus("Esa categoria ya existe.", "error");
    return;
  }

  categories.push({ value, label });
  categories = normalizeCategories(categories, products);
  renderCategoryOptions(adminCategorySelect, value);
  updateSuggestedReference(false);
  renderCategoryList();
  renderStats();
  renderList();
  enableExports();
  setStatus("Categoria creada. Guarda catalogo.js en data/.");
  adminCategoryForm.reset();
  saveCatalogToFile(true);
});

adminAddForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (adminAddButton) {
    adminAddButton.disabled = true;
  }

  const formData = new FormData(adminAddForm);
  const category =
    slugifyCategoryValue(formData.get("category")) || getDefaultCategoryValue();
  const name = String(formData.get("name") || "").trim();
  const reference = String(formData.get("reference") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const priceValue = String(formData.get("price") || "").trim();
  const alt = String(formData.get("alt") || "").trim() || name;
  const agotado = formData.get("agotado") === "on";

  if (!name) {
    setStatus("Completa el nombre.", "error");
    if (adminAddButton) {
      adminAddButton.disabled = false;
    }
    return;
  }

  if (!pendingImageFile) {
    setStatus("Selecciona una imagen antes de agregar.", "error");
    if (adminAddButton) {
      adminAddButton.disabled = false;
    }
    return;
  }

  const formattedPrice = pricePattern.test(priceValue)
    ? priceValue
    : formatPrice(priceValue);
  if (!formattedPrice || !pricePattern.test(formattedPrice)) {
    setStatus("El precio debe tener formato $0.000.", "error");
    if (adminAddButton) {
      adminAddButton.disabled = false;
    }
    return;
  }

  const imagePath = getImagePathFromFile(category, pendingImageFile);
  if (!imagePath || !imagePattern.test(imagePath)) {
    setStatus(
      "La imagen debe estar en productos/ con extension valida.",
      "error",
    );
    if (adminAddButton) {
      adminAddButton.disabled = false;
    }
    return;
  }

  products.push({
    id: String(nextProductId++),
    category,
    name,
    reference,
    description,
    price: formattedPrice,
    image: imagePath,
    alt,
    agotado,
  });

  renderStats();
  renderValidation();
  renderList();
  enableExports();
  adminAddForm.reset();
  renderCategoryOptions(adminCategorySelect, getDefaultCategoryValue());
  updateSuggestedReference(true);
  resetPendingImage();
  setStatus("Producto agregado. Guarda catalogo.js en data/.");
  saveCatalogToFile(true);
  if (adminAddButton) {
    adminAddButton.disabled = false;
  }
});

adminImageFile.addEventListener("change", (event) => {
  const file = event.target.files[0];
  pendingImageFile = file || null;
  setAddImagePreviewFromFile();
});

importCatalogInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const data = parseCatalogoJs(reader.result);
    if (data?.products) {
      applyCatalogData(
        data.products,
        data.categories,
        "Catalogo cargado desde archivo.",
      );
    } else {
      setStatus("El archivo catalogo.js no es valido.", "error");
    }
  };
  reader.readAsText(file);
  importCatalogInput.value = "";
});

exportCatalogButton.addEventListener("click", () => {
  exportCatalog();
});

if (adminCategorySelect) {
  adminCategorySelect.addEventListener("change", () => {
    updateSuggestedReference(false);
  });
}

if (saveCatalogButton) {
  saveCatalogButton.addEventListener("click", () => {
    saveCatalogToFile(true);
  });
}

if (adminSearchInput) {
  adminSearchInput.addEventListener("input", updateSearchResults);
}

window.addEventListener("load", () => {
  loadInitialCatalog();
});
