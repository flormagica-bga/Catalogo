const fs = require("fs");
const path = require("path");
const vm = require("vm");

const catalogPath = path.join(__dirname, "..", "data", "catalogo.js");

const categoryConfigs = {
  collares: { prefix: "CP" },
  aretes: { prefix: "AP" },
  anillos: { prefix: "NP" },
  conjuntos: { prefix: "JP" },
  pinzas: { prefix: "PP" },
};

function readCatalog(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox);

  return {
    categories: Array.isArray(sandbox.window.CATEGORIAS) ? sandbox.window.CATEGORIAS : [],
    products: Array.isArray(sandbox.window.CATALOGO) ? sandbox.window.CATALOGO : [],
  };
}

function getReference(product) {
  return String(product?.reference ?? product?.referencia ?? "").trim();
}

function formatReference(prefix, index) {
  return `${prefix}${String(index).padStart(2, "0")}`;
}

function normalizeReferences(products) {
  const nextProducts = products.map((product) => ({ ...product }));
  const report = {};

  for (const [category, config] of Object.entries(categoryConfigs)) {
    const categoryProducts = nextProducts.filter((product) => product.category === category);
    const changes = [];

    categoryProducts.forEach((product, index) => {
      const nextReference = formatReference(config.prefix, index + 1);
      const previousReference = getReference(product);

      if (previousReference !== nextReference) {
        changes.push({
          id: String(product.id),
          name: product.name,
          before: previousReference || "(vacia)",
          after: nextReference,
        });
      }

      product.reference = nextReference;
    });

    report[category] = {
      total: categoryProducts.length,
      changed: changes.length,
      unchanged: categoryProducts.length - changes.length,
      firstChanges: changes.slice(0, 8),
      lastReference: categoryProducts.length
        ? formatReference(config.prefix, categoryProducts.length)
        : "(sin productos)",
    };
  }

  return { products: nextProducts, report };
}

function serializeCatalog(categories, products) {
  return `window.CATEGORIAS = ${JSON.stringify(categories, null, 2)};\nwindow.CATALOGO = ${JSON.stringify(products, null, 2)};\n`;
}

function main() {
  const { categories, products } = readCatalog(catalogPath);
  const result = normalizeReferences(products);

  fs.writeFileSync(catalogPath, serializeCatalog(categories, result.products), "utf8");
  console.log("Orden usado: el orden actual de window.CATALOGO en data/catalogo.js.");
  console.log("Prefijo asumido para pinzas: PP.");
  console.log(JSON.stringify(result.report, null, 2));
  console.log(`\nReferencias actualizadas en ${catalogPath}.`);
}

main();
