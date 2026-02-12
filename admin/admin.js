const adminStatus = document.getElementById("adminStatus");
const saveCatalogButton = document.getElementById("saveCatalog");
const exportCatalogButton = document.getElementById("exportCatalog");
const importCatalogInput = document.getElementById("importCatalog");
const adminStats = document.getElementById("adminStats");
const adminValidation = document.getElementById("adminValidation");
const adminAddForm = document.getElementById("adminAddForm");
const adminList = document.getElementById("adminList");
const adminCount = document.getElementById("adminCount");
const adminImageFile = document.getElementById("adminImageFile");
const adminImagePreview = document.getElementById("adminImagePreview");
const adminImagePreviewImg = document.getElementById("adminImagePreviewImg");
const adminAddButton = document.getElementById("adminAddButton");

let products = [];
let nextProductId = 1;
let pendingImageFile = null;
let pendingImageUrl = "";
let catalogFileHandle = null;

const pricePattern = /^\$\d{1,3}(\.\d{3})*$/;
const imagePattern = /^productos\/.+\.(png|jpe?g|webp)$/i;

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
        category: item.category || "collares",
        name: item.name || "",
        description: item.description || "",
        price: item.price || "",
        image: item.image || "",
        alt: item.alt || item.name || "",
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
  const counts = products.reduce(
    (acc, product) => {
      acc[product.category] = (acc[product.category] || 0) + 1;
      return acc;
    },
    { collares: 0, aretes: 0, anillos: 0, conjuntos: 0 },
  );

  const stats = [
    { label: "Total", value: total },
    { label: "Collares", value: counts.collares || 0 },
    { label: "Aretes", value: counts.aretes || 0 },
    { label: "Anillos", value: counts.anillos || 0 },
    { label: "Conjuntos", value: counts.conjuntos || 0 },
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

function renderList() {
  adminList.innerHTML = "";
  adminCount.textContent = `${products.length} productos`;

  if (products.length === 0) {
    const empty = document.createElement("p");
    empty.className = "admin-hint";
    empty.textContent = "No hay productos cargados.";
    adminList.appendChild(empty);
    return;
  }

  products.forEach((product) => {
    const row = document.createElement("div");
    row.className = "admin-row";

    const header = document.createElement("div");
    header.className = "admin-row-header";

    const title = document.createElement("h4");
    title.textContent = `${product.name} · ID ${product.id}`;

    const thumb = document.createElement("div");
    thumb.className = "admin-thumb";
    const thumbImg = document.createElement("img");
    thumbImg.src = getAdminImagePath(product.image);
    thumbImg.alt = product.alt || product.name;
    thumb.appendChild(thumbImg);

    header.appendChild(title);
    header.appendChild(thumb);

    const grid = document.createElement("div");
    grid.className = "admin-row-grid";

    const categorySelect = document.createElement("select");
    [
      { value: "collares", label: "Collares" },
      { value: "aretes", label: "Aretes" },
      { value: "anillos", label: "Anillos" },
      { value: "conjuntos", label: "Conjuntos" },
    ].forEach((optionData) => {
      const option = document.createElement("option");
      option.value = optionData.value;
      option.textContent = optionData.label;
      if (optionData.value === product.category) {
        option.selected = true;
      }
      categorySelect.appendChild(option);
    });

    categorySelect.addEventListener("change", () => {
      product.category = categorySelect.value;
      product.image = `productos/${product.category}/${product.image
        .split("/")
        .pop()}`;
      thumbImg.src = getAdminImagePath(product.image);
      renderValidation();
      renderStats();
    });

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.value = product.name;
    nameInput.addEventListener("input", () => {
      product.name = nameInput.value.trim();
      title.textContent = `${product.name} · ID ${product.id}`;
      renderValidation();
    });

    const descriptionInput = document.createElement("textarea");
    descriptionInput.rows = 2;
    descriptionInput.value = product.description;
    descriptionInput.addEventListener("input", () => {
      product.description = descriptionInput.value.trim();
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
      thumbImg.src = getAdminImagePath(newPath);
      renderValidation();
    });

    const altInput = document.createElement("input");
    altInput.type = "text";
    altInput.value = product.alt;
    altInput.addEventListener("input", () => {
      product.alt = altInput.value.trim();
      thumbImg.alt = product.alt || product.name;
    });

    grid.appendChild(createField("Categoria", categorySelect));
    grid.appendChild(createField("Nombre", nameInput));
    grid.appendChild(createField("Descripcion", descriptionInput));
    grid.appendChild(createField("Precio", priceInput));
    const imageField = createField("Imagen", imageInput);
    imageField.appendChild(imageFileLabel);
    grid.appendChild(imageField);
    grid.appendChild(createField("Alt", altInput));

    const actions = document.createElement("div");
    actions.className = "admin-row-actions";
    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "admin-remove";
    removeButton.textContent = "Eliminar";
    removeButton.addEventListener("click", () => {
      products = products.filter((item) => item.id !== product.id);
      renderStats();
      renderValidation();
      renderList();
      enableExports();
    });
    actions.appendChild(removeButton);

    row.appendChild(header);
    row.appendChild(grid);
    row.appendChild(actions);
    adminList.appendChild(row);
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

function enableExports() {
  exportCatalogButton.disabled = products.length === 0;
  if (saveCatalogButton) {
    saveCatalogButton.disabled = products.length === 0;
  }
}

function exportCatalog() {
  const data = JSON.stringify(products, null, 2);
  downloadFile(
    `window.CATALOGO = ${data};\n`,
    "catalogo.js",
    "application/javascript",
  );
  setStatus("Descargado catalogo.js. Reemplaza data/catalogo.js.");
}

async function saveCatalogToFile(fallbackToExport) {
  const data = `window.CATALOGO = ${JSON.stringify(products, null, 2)};\n`;

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

function applyProducts(data, statusMessage) {
  products = normalizeProducts(data);
  updateNextId();
  renderStats();
  renderValidation();
  renderList();
  enableExports();
  setStatus(statusMessage || "Catalogo cargado.");
}

function parseCatalogoJs(content) {
  const match = content.match(/window\.CATALOGO\s*=\s*(\[.*\]);?/s);
  if (!match) {
    return null;
  }

  try {
    return JSON.parse(match[1]);
  } catch (error) {
    return null;
  }
}

function loadInitialCatalog() {
  if (Array.isArray(window.CATALOGO)) {
    applyProducts(window.CATALOGO, "Catalogo cargado.");
    return;
  }

  setStatus("No se encontro data/catalogo.js.", "error");
}

adminAddForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (adminAddButton) {
    adminAddButton.disabled = true;
  }

  const formData = new FormData(adminAddForm);
  const category = formData.get("category");
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const priceValue = String(formData.get("price") || "").trim();
  const alt = String(formData.get("alt") || "").trim() || name;

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
    description,
    price: formattedPrice,
    image: imagePath,
    alt,
  });

  renderStats();
  renderValidation();
  renderList();
  enableExports();
  adminAddForm.reset();
  adminAddForm.querySelector("select").value = "collares";
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
    if (Array.isArray(data)) {
      applyProducts(data, "Catalogo cargado desde archivo.");
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

if (saveCatalogButton) {
  saveCatalogButton.addEventListener("click", () => {
    saveCatalogToFile(true);
  });
}

window.addEventListener("load", () => {
  loadInitialCatalog();
});
