// src/lib/onboarding/menuExtraction.ts

export type ExtractedMenuProduct = {
  name: string;
  description: string;
  categoryName: string;
  priceCents: number;
  imagePrompt: string;
  namingConfidence: "HIGH" | "MEDIUM" | "LOW";
};

export type ExtractedMenuResult = {
  products: ExtractedMenuProduct[];
  categories: string[];
  notes: string[];
};

export function normalizeExtractedMenuResult(
  input: unknown,
): ExtractedMenuResult {
  const raw = input as Partial<ExtractedMenuResult>;

  const products = Array.isArray(raw?.products)
    ? raw.products
        .map((item: any) => ({
          name: String(item?.name || "").trim(),
          description: String(item?.description || "").trim(),
          categoryName:
            String(item?.categoryName || item?.category || "Menu").trim() ||
            "Menu",
          priceCents: normalizePriceCents(item?.priceCents),
          imagePrompt: String(item?.imagePrompt || "").trim(),
          namingConfidence: normalizeNamingConfidence(item?.namingConfidence),
        }))
        .filter((item) => item.name.length > 0 && item.priceCents > 0)
    : [];

  const categoriesRaw = Array.isArray(raw?.categories) ? raw.categories : [];

  const categories = Array.from(
    new Set([
      ...categoriesRaw.map((c) => String(c || "").trim()).filter(Boolean),
      ...products.map((p) => p.categoryName).filter(Boolean),
    ]),
  );

  const notes = Array.isArray(raw?.notes)
    ? raw.notes.map((note) => String(note || "").trim()).filter(Boolean)
    : [];

  return { products, categories, notes };
}

export function normalizePriceCents(value: unknown) {
  const n = Number(value);

  if (!Number.isFinite(n) || n < 0) return 0;

  return Math.round(n);
}

function normalizeNamingConfidence(value: unknown): "HIGH" | "MEDIUM" | "LOW" {
  if (value === "HIGH" || value === "MEDIUM" || value === "LOW") {
    return value;
  }

  return "MEDIUM";
}

export function safeParseJsonObject(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("AI response did not contain valid JSON.");
    return JSON.parse(match[0]);
  }
}

export function buildMenuExtractionPrompt(
  namingTheme:
    | "DESCRIPTIVE"
    | "KASI_STYLE"
    | "MINIMAL"
    | "COMBO_STYLE"
    | "STORE_BRANDED",
) {
  const themeInstruction = getThemeInstruction(namingTheme);

  return `
You are digitising a South African kasi fast-food menu from image(s).

Return ONLY valid JSON. Do not include markdown.

Extract menu items with prices and organise them into categories.

Important context:
- Stores may sell kotas, chips, burgers, chicken, plates, drinks, combos, extras, russians, viennas, bunny chow, shisanyama, pap, and more.
- Some menus do not have clear product names. They may only list ingredients or descriptions.
- If an item has no clear name but has a clear description and price, create a short useful product name.
- Do not invent ingredients.
- Do not invent prices.
- Exclude products with no clear price.
- If text is unclear, add a note in "notes".

Naming theme:
${themeInstruction}

Category rules:
- Group items into simple customer-friendly categories.
- Use categories like "Kotas", "Chips", "Combos", "Burgers", "Chicken", "Plates", "Drinks", "Extras", "Specials", or "Menu".
- If unsure, use "Menu".

Return this exact shape:
{
  "products": [
    {
      "name": "Russian Cheese Kota",
      "description": "Quarter bread with chips, egg, russian and cheese.",
      "categoryName": "Kotas",
      "priceCents": 4500,
      "imagePrompt": "A realistic Russian cheese kota with chips, egg, russian and cheese, photographed for a food delivery app.",
      "namingConfidence": "MEDIUM"
    }
  ],
  "categories": [
    "Kotas",
    "Combos",
    "Chips"
  ],
  "notes": []
}
`.trim();
}

function getThemeInstruction(
  theme:
    | "DESCRIPTIVE"
    | "KASI_STYLE"
    | "MINIMAL"
    | "COMBO_STYLE"
    | "STORE_BRANDED",
) {
  switch (theme) {
    case "KASI_STYLE":
      return `Use familiar kasi-style food naming. Keep it natural and local, but not exaggerated or gimmicky.`;
    case "MINIMAL":
      return `Use short, clean names. Aim for 2 to 3 words where possible.`;
    case "COMBO_STYLE":
      return `Name items in a way that makes the combo structure clear, especially for meals and bundled items.`;
    case "STORE_BRANDED":
      return `Use slightly styled names that feel polished and appealing, but still clear and useful for ordering.`;
    case "DESCRIPTIVE":
    default:
      return `Use clear, literal, descriptive names based only on the visible ingredients or menu text.`;
  }
}
