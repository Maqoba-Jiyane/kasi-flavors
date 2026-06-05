"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ImageIcon, Pencil } from "lucide-react";
import AdminImageUploadField from "@/components/admin/AdminImageUploadField";

type ProductForImages = {
  id: string;
  name: string;
  imageUrl: string | null;
  isAvailable: boolean;
  categoryId: string | null;
  categoryName: string;
  categorySlug: string;
  categorySortOrder: number;
};

type Props = {
  storeId: string;
  products: ProductForImages[];
};

export function AdminProductImageManager({ storeId, products }: Props) {
  const router = useRouter();

  const [selectedProductId, setSelectedProductId] = React.useState<
    string | null
  >(null);

  const [savingId, setSavingId] = React.useState<string | null>(null);

  const [imageUrls, setImageUrls] = React.useState<Record<string, string>>(() =>
    Object.fromEntries(
      products.map((product) => [product.id, product.imageUrl ?? ""]),
    ),
  );

  const [message, setMessage] = React.useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const selectedProduct =
    products.find((product) => product.id === selectedProductId) ?? null;

  const categoryGroups = React.useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        name: string;
        slug: string;
        sortOrder: number;
        products: ProductForImages[];
      }
    >();

    for (const product of products) {
      const id = product.categoryId || product.categorySlug || "menu";

      const existing = map.get(id);

      if (existing) {
        existing.products.push(product);
      } else {
        map.set(id, {
          id,
          name: product.categoryName || "Menu",
          slug: product.categorySlug || "menu",
          sortOrder:
            typeof product.categorySortOrder === "number"
              ? product.categorySortOrder
              : 999,
          products: [product],
        });
      }
    }

    return Array.from(map.values())
      .map((group) => ({
        ...group,
        products: group.products.sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        return a.name.localeCompare(b.name);
      });
  }, [products]);

  async function saveProductImage(productId: string) {
    setMessage(null);

    try {
      setSavingId(productId);

      const res = await fetch(`/api/admin/products/${productId}/image`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          imageUrl: imageUrls[productId] || "",
        }),
      });

      const data = await res.json();

      if (!res.ok || !data?.success) {
        setMessage({
          type: "error",
          text: data?.error || "Failed to update product image.",
        });
        return;
      }

      setMessage({
        type: "success",
        text: "Product image updated.",
      });

      router.refresh();
    } catch {
      setMessage({
        type: "error",
        text: "Something went wrong. Please try again.",
      });
    } finally {
      setSavingId(null);
    }
  }

  function clearImage(productId: string) {
    setImageUrls((current) => ({
      ...current,
      [productId]: "",
    }));
  }

  return (
    <section className="rounded-4xl border border-black/10 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-street-orange">
            Product pictures
          </p>

          <h2 className="mt-1 text-2xl font-black text-kasi-black">
            Manage product images
          </h2>

          <p className="mt-1 max-w-2xl text-sm font-medium leading-6 text-black/55">
            Choose a product to view, upload, replace, or remove its picture.
            Product images will only show publicly when this store has product
            images enabled.
          </p>
        </div>

        <span className="w-fit rounded-full bg-kasi-cream px-3 py-1 text-[11px] font-black uppercase tracking-wide text-black/50">
          {products.length} product{products.length === 1 ? "" : "s"}
        </span>
      </div>

      {message && (
        <div
          className={[
            "mt-5 rounded-2xl border px-4 py-3 text-sm font-bold",
            message.type === "success"
              ? "border-kasi-green/20 bg-kasi-green/10 text-kasi-green"
              : "border-red-200 bg-red-50 text-red-600",
          ].join(" ")}
        >
          {message.text}
        </div>
      )}

      {products.length === 0 ? (
        <p className="mt-5 rounded-3xl bg-kasi-cream p-4 text-sm font-bold text-black/55">
          No products found.
        </p>
      ) : (
        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_420px]">
          {/* Product list */}
          <div className="overflow-hidden rounded-3xl border border-black/10">
            <div className="bg-kasi-black px-4 py-3">
              <p className="text-xs font-black uppercase tracking-wide text-white/70">
                Choose product
              </p>
            </div>

            <div className="bg-white">
              {categoryGroups.map((group) => (
                <div
                  key={group.id}
                  className="border-b border-black/10 last:border-b-0"
                >
                  <div className="bg-kasi-cream px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-black uppercase tracking-wide text-kasi-black">
                        {group.name}
                      </p>

                      <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black uppercase tracking-wide text-black/45">
                        {group.products.length} item
                        {group.products.length === 1 ? "" : "s"}
                      </span>
                    </div>
                  </div>

                  <div className="divide-y divide-black/10">
                    {group.products.map((product) => {
                      const imageUrl = imageUrls[product.id] || "";
                      const isSelected = selectedProductId === product.id;

                      return (
                        <div key={product.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedProductId(
                                isSelected ? null : product.id,
                              );
                              setMessage(null);
                            }}
                            className={[
                              "flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition",
                              isSelected
                                ? "bg-kasi-green/10"
                                : "bg-white hover:bg-kasi-cream",
                            ].join(" ")}
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-kasi-cream">
                                {imageUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={imageUrl}
                                    alt={product.name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-black/30">
                                    <ImageIcon className="h-5 w-5" />
                                  </div>
                                )}
                              </div>

                              <div className="min-w-0">
                                <p className="truncate text-sm font-black text-kasi-black">
                                  {product.name}
                                </p>

                                <p className="mt-1 text-xs font-medium text-black/45">
                                  {product.categoryName} ·{" "}
                                  {imageUrl ? "Image added" : "No image yet"} ·{" "}
                                  {product.isAvailable ? "Available" : "Hidden"}
                                </p>
                              </div>
                            </div>

                            <span
                              className={[
                                "shrink-0 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wide",
                                isSelected
                                  ? "bg-kasi-green text-white"
                                  : "bg-kasi-cream text-black/50",
                              ].join(" ")}
                            >
                              {isSelected ? "Close" : "Edit"}
                            </span>
                          </button>

                          {isSelected && (
                            <div className="border-t border-black/10 bg-kasi-cream p-4 lg:hidden">
                              <ProductImageEditor
                                product={product}
                                imageUrl={imageUrls[product.id] ?? ""}
                                saving={savingId === product.id}
                                onUploaded={(url) =>
                                  setImageUrls((current) => ({
                                    ...current,
                                    [product.id]: url,
                                  }))
                                }
                                onChangeUrl={(url) =>
                                  setImageUrls((current) => ({
                                    ...current,
                                    [product.id]: url,
                                  }))
                                }
                                onClear={() => clearImage(product.id)}
                                onSave={() => saveProductImage(product.id)}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Selected product editor */}
          <aside className="hidden h-fit rounded-3xl border border-black/10 bg-kasi-cream p-4 lg:sticky lg:top-24 lg:block">
            {!selectedProduct ? (
              <div className="rounded-3xl bg-white p-6 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-kasi-black text-golden-yellow">
                  <ImageIcon className="h-6 w-6" />
                </div>

                <h3 className="mt-4 text-lg font-black text-kasi-black">
                  Select a product
                </h3>

                <p className="mt-2 text-sm font-medium leading-6 text-black/55">
                  Choose a product from the list to view or update its image.
                </p>
              </div>
            ) : (
              <ProductImageEditor
                product={selectedProduct}
                imageUrl={imageUrls[selectedProduct.id] ?? ""}
                saving={savingId === selectedProduct.id}
                onUploaded={(url) =>
                  setImageUrls((current) => ({
                    ...current,
                    [selectedProduct.id]: url,
                  }))
                }
                onChangeUrl={(url) =>
                  setImageUrls((current) => ({
                    ...current,
                    [selectedProduct.id]: url,
                  }))
                }
                onClear={() => clearImage(selectedProduct.id)}
                onSave={() => saveProductImage(selectedProduct.id)}
              />
            )}
          </aside>
        </div>
      )}
    </section>
  );
}

function ProductImageEditor({
  product,
  imageUrl,
  saving,
  onUploaded,
  onChangeUrl,
  onClear,
  onSave,
}: {
  product: ProductForImages;
  imageUrl: string;
  saving: boolean;
  onUploaded: (url: string) => void;
  onChangeUrl: (url: string) => void;
  onClear: () => void;
  onSave: () => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-black uppercase tracking-wide text-street-orange">
          Editing product image
        </p>

        <h3 className="mt-1 text-xl font-black text-kasi-black">
          {product.name}
        </h3>

        <p className="mt-1 text-xs font-medium text-black/50">
          {product.categoryName} ·{" "}
          {product.isAvailable ? "Available" : "Hidden"}
        </p>
      </div>

      <AdminImageUploadField
        label="Product image"
        value={imageUrl}
        purpose="product-image"
        entityId={product.id}
        onUploaded={onUploaded}
      />

      <label className="grid gap-1.5">
        <span className="text-xs font-black uppercase tracking-wide text-black/50">
          Image URL
        </span>

        <input
          value={imageUrl}
          onChange={(event) => onChangeUrl(event.target.value)}
          className="w-full rounded-2xl border-2 border-black/10 bg-white px-4 py-3 text-sm font-semibold text-kasi-black outline-none transition placeholder:text-black/35 focus:border-kasi-green focus:ring-4 focus:ring-kasi-green/10"
          placeholder="https://..."
        />
      </label>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="inline-flex flex-1 items-center justify-center rounded-full bg-kasi-green px-5 py-3 text-sm font-black text-white transition hover:bg-street-orange disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Pencil className="mr-2 h-4 w-4" />
          {saving ? "Saving..." : "Save image"}
        </button>

        <button
          type="button"
          onClick={onClear}
          disabled={saving}
          className="inline-flex flex-1 items-center justify-center rounded-full border-2 border-black/10 bg-white px-5 py-3 text-sm font-black text-kasi-black transition hover:border-red-500 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Remove image
        </button>
      </div>

      <p className="rounded-2xl bg-white px-4 py-3 text-xs font-medium leading-5 text-black/55">
        Removing the image only clears it from the product after you click{" "}
        <span className="font-black">Save image</span>.
      </p>
    </div>
  );
}
