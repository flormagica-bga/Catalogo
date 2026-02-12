const catalogFile = document.getElementById("catalogFile");
const adminStatus = document.getElementById("adminStatus");
const exportJsonButton = document.getElementById("exportJson");
const adminStats = document.getElementById("adminStats");
const adminList = document.getElementById("adminList");
const adminValidation = document.getElementById("adminValidation");
const adminAddForm = document.getElementById("adminAddForm");
const importJsonInput = document.getElementById("importJson");
const adminPreview = document.getElementById("adminPreview");
const togglePreviewButton = document.getElementById("togglePreview");

let products = [];
let nextProductId = 1;
let previewVisible = false;

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

function validateProduct(product) {
  const issues = [];

  if (!pricePattern.test(product.price)) {
    issues.push("Precio invalido en " + product.name + ".");
  }

  if (!imagePattern.test(product.image)) {
    issues.push("Ruta de imagen invalida en " + product.name + ".");
  }

  return issues;
}

function renderValidation() {
  adminValidation.innerHTML = "";
  const issues = products.flatMap((product) => validateProduct(product));

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

  if (issues.length > 4) {
    const more = document.createElement("div");
    more.textContent = `Y ${issues.length - 4} mas...`;
    adminValidation.appendChild(more);
  }
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
    row.dataset.id = product.id;

    const header = document.createElement("div");
    header.className = "admin-row-header";

    const title = document.createElement("h4");
    title.textContent = `ID ${product.id}`;

    const thumb = document.createElement("div");
    thumb.className = "admin-thumb";
    const thumbImg = document.createElement("img");
    thumbImg.src = product.image || "";
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
      renderStats();
      refreshPreview();
    });

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.value = product.name;
    nameInput.addEventListener("input", () => {
      product.name = nameInput.value.trim();
      renderValidation();
      refreshPreview();
    });

    const descriptionInput = document.createElement("textarea");
    descriptionInput.rows = 2;
    descriptionInput.value = product.description;
    descriptionInput.addEventListener("input", () => {
      product.description = descriptionInput.value.trim();
      refreshPreview();
    });

    const priceInput = document.createElement("input");
    priceInput.type = "text";
    priceInput.value = product.price;
    priceInput.addEventListener("input", () => {
      product.price = priceInput.value.trim();
      priceInput.classList.toggle("invalid", !pricePattern.test(product.price));
      renderValidation();
      refreshPreview();
    });
    priceInput.classList.toggle("invalid", !pricePattern.test(product.price));

    const imageInput = document.createElement("input");
    imageInput.type = "text";
    imageInput.value = product.image;
    imageInput.addEventListener("input", () => {
      product.image = imageInput.value.trim();
      imageInput.classList.toggle("invalid", !imagePattern.test(product.image));
      thumbImg.src = product.image;
      renderValidation();
      refreshPreview();
    });
    imageInput.classList.toggle("invalid", !imagePattern.test(product.image));

    const altInput = document.createElement("input");
    altInput.type = "text";
    altInput.value = product.alt;
    altInput.addEventListener("input", () => {
      product.alt = altInput.value.trim();
      thumbImg.alt = product.alt || product.name;
      refreshPreview();
    });

    grid.appendChild(createField("Categoria", categorySelect));
    grid.appendChild(createField("Nombre", nameInput));
    grid.appendChild(createField("Descripcion", descriptionInput));
    grid.appendChild(createField("Precio", priceInput));
    grid.appendChild(createField("Imagen", imageInput));
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
      refreshPreview();
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

function refreshPreview() {
  if (!previewVisible) {
    return;
  }

  adminPreview.innerHTML = "";

  if (products.length === 0) {
    adminPreview.textContent =
      "Carga primero el catalogo.json para la vista previa.";
    return;
  }

  const grid = document.createElement("div");
  grid.className = "preview-grid";

  products.forEach((product) => {
    const card = document.createElement("div");
    card.className = "preview-card";

    const image = document.createElement("img");
    image.src = product.image;
    image.alt = product.alt || product.name;

    const name = document.createElement("h4");
    name.textContent = product.name;

    const description = document.createElement("p");
    description.textContent = product.description;

    const price = document.createElement("span");
    price.textContent = product.price;

    card.appendChild(image);
    card.appendChild(name);
    card.appendChild(description);
    card.appendChild(price);
    grid.appendChild(card);
  });

  adminPreview.appendChild(grid);
}

function enableExports() {
  exportJsonButton.disabled = products.length === 0;
}

function applyProducts(data, statusMessage) {
  products = normalizeProducts(data);
  updateNextId();
  renderStats();
  renderValidation();
  renderList();
  enableExports();
  refreshPreview();
  setStatus(statusMessage || "Catalogo cargado.");
}

function fetchCatalog() {
  fetch("../data/catalogo.json", { cache: "no-store" })
    .then((response) => (response.ok ? response.json() : null))
    .then((data) => {
      if (Array.isArray(data) && data.length > 0) {
        applyProducts(data, "Catalogo cargado desde catalogo.json.");
        return;
      }
      setStatus("No se encontro catalogo.json o esta vacio.", "error");
    })
    .catch(() => {
      setStatus("No se pudo cargar catalogo.json.", "error");
    });
}

catalogFile.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      applyProducts(data, "Catalogo JSON cargado correctamente.");
    } catch (error) {
      setStatus("El archivo JSON no es valido.", "error");
    }
  };

  reader.readAsText(file);
  catalogFile.value = "";
});

adminAddForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(adminAddForm);
  const product = {
    id: String(nextProductId++),
    category: formData.get("category"),
    name: String(formData.get("name") || "").trim(),
    description: String(formData.get("description") || "").trim(),
    price: String(formData.get("price") || "").trim(),
    image: String(formData.get("image") || "").trim(),
    alt: String(formData.get("alt") || "").trim(),
  };

  if (!product.name || !product.image) {
    setStatus("Completa el nombre y la ruta de imagen.", "error");
    return;
  }

  if (!pricePattern.test(product.price)) {
    setStatus("El precio debe tener formato $0.000.", "error");
    return;
  }

  if (!imagePattern.test(product.image)) {
    setStatus(
      "La ruta debe iniciar con productos/ y tener extension valida.",
      "error",
    );
    return;
  }

  products.push(product);
  updateNextId();
  renderStats();
  renderValidation();
  renderList();
  enableExports();
  refreshPreview();
  adminAddForm.reset();
  adminAddForm.querySelector("select").value = "collares";
  setStatus("Producto agregado.");
});

importJsonInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      applyProducts(data, "JSON importado correctamente.");
    } catch (error) {
      setStatus("El archivo JSON no es valido.", "error");
    }
  };

  reader.readAsText(file);
  importJsonInput.value = "";
});

exportJsonButton.addEventListener("click", () => {
  const data = JSON.stringify(products, null, 2);
  downloadFile(data, "catalogo.json", "application/json");
});

togglePreviewButton.addEventListener("click", () => {
  previewVisible = !previewVisible;
  togglePreviewButton.textContent = previewVisible
    ? "Ocultar vista previa"
    : "Mostrar vista previa";
  refreshPreview();
});

window.addEventListener("load", () => {
  fetchCatalog();
});
