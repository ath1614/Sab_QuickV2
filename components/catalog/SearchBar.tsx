/* eslint-disable @next/next/no-img-element */
"use client";

import * as React from "react";
import { Search, X, Loader2, ArrowRight, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ProductData } from "./ProductCard";

interface SearchBarProps {
  onSearchSubmit: (query: string) => void;
  onAddToCart?: (product: ProductData) => void;
  initialQuery?: string;
  placeholder?: string;
}

export function SearchBar({
  onSearchSubmit,
  onAddToCart,
  initialQuery = "",
  placeholder = "Search 5,000+ groceries, dairy, snacks, cold drinks...",
}: SearchBarProps) {
  const [query, setQuery] = React.useState<string>(initialQuery);
  const [results, setResults] = React.useState<ProductData[]>([]);
  const [isOpen, setIsOpen] = React.useState<boolean>(false);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const debounceTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  // Close dropdown on outside click
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 300ms debounced live search
  const handleInputChange = (val: string) => {
    setQuery(val);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (val.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/products?search=${encodeURIComponent(val.trim())}`
        );
        if (res.ok) {
          const data = await res.json();
          setResults((data.products || []).slice(0, 5));
          setIsOpen(true);
        }
      } catch (err) {
        console.warn("Search preview error:", err);
      } finally {
        setIsLoading(false);
      }
    }, 300);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      setIsOpen(false);
      onSearchSubmit(query.trim());
    }
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setIsOpen(false);
    onSearchSubmit("");
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl mx-auto">
      {/* Search Input Container */}
      <div className="relative flex items-center">
        <Search className="absolute left-4 w-4 h-4 text-muted-foreground pointer-events-none" />

        <Input
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results.length > 0 && query.trim().length >= 2) {
              setIsOpen(true);
            }
          }}
          placeholder={placeholder}
          className="w-full h-12 pl-11 pr-12 rounded-2xl bg-white border border-border-subtle shadow-sm focus-visible:ring-2 focus-visible:ring-primary text-sm font-medium transition-all"
        />

        {/* Clear or Loading Indicator */}
        <div className="absolute right-3.5 flex items-center">
          {isLoading ? (
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
          ) : query.length > 0 ? (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-full text-muted-foreground hover:text-surface-dark hover:bg-slate-100 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Live Dropdown Overlay (Top 5 Matches) */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 rounded-2xl bg-white border border-border-subtle shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
          <div className="p-2 divide-y divide-slate-100">
            {results.map((product) => (
              <div
                key={product.id}
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group"
                onClick={() => {
                  setIsOpen(false);
                  onSearchSubmit(product.title);
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-lg bg-slate-100 border border-border-subtle flex items-center justify-center shrink-0 font-bold text-xs text-primary">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.title}
                        className="w-full h-full object-contain p-1 rounded-lg"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = "none";
                        }}
                      />
                    ) : (
                      product.title.slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-surface-dark line-clamp-1 group-hover:text-primary transition-colors">
                      {product.title}
                    </div>
                    <div className="text-[11px] text-muted-foreground font-mono">
                      {product.unitQuantity} •{" "}
                      <span className="font-bold text-surface-dark">
                        ₹{product.salePrice}
                      </span>
                      {product.mrp > product.salePrice && (
                        <span className="line-through ml-1 text-slate-400">
                          ₹{product.mrp}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddToCart?.(product);
                  }}
                  className="h-8 border-primary text-primary hover:bg-primary hover:text-white font-bold text-xs rounded-lg transition-colors shrink-0 gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> ADD
                </Button>
              </div>
            ))}
          </div>

          {/* View All Matches Footer */}
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onSearchSubmit(query.trim());
            }}
            className="w-full bg-slate-50 hover:bg-slate-100/80 px-4 py-2.5 text-xs font-bold text-primary flex items-center justify-center gap-1 border-t border-slate-100 transition-colors"
          >
            <span>View all matching results for &ldquo;{query}&rdquo;</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
