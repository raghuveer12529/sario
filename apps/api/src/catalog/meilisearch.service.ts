import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

interface SearchableProduct {
  id: string;
  name: string;
  slug: string;
  description: string;
  fabric?: string | null;
  region?: string | null;
  tags: string[];
  categoryId: string;
  vendorId: string;
  vendorName: string;
  vendorSlug: string;
  minPricePaise: number;
  mrpPaise?: number;
  searchIndexedAt?: number;
  primaryImageUrl?: string;
  occasion: string[];
}

@Injectable()
export class MeilisearchService implements OnModuleInit {
  private readonly logger = new Logger(MeilisearchService.name);
  private readonly host: string;
  private readonly apiKey: string;
  private readonly index = "products";

  constructor(private readonly config: ConfigService) {
    this.host = this.config.get("MEILI_HOST", "http://localhost:7700");
    this.apiKey = this.config.get("MEILI_API_KEY", "sario_meili_dev_key");
  }

  async onModuleInit() {
    await this.setupIndex();
  }

  async upsert(product: SearchableProduct): Promise<void> {
    await this.request("POST", `/indexes/${this.index}/documents`, [product]);
  }

  async delete(productId: string): Promise<void> {
    await this.request("DELETE", `/indexes/${this.index}/documents/${productId}`);
  }

  async search(query: string, filters: Record<string, unknown> = {}, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const body = {
      q: query,
      limit,
      offset,
      facets: ["region", "fabric", "categoryId", "occasion"],
      ...filters,
    };
    return this.request<{ hits: SearchableProduct[]; estimatedTotalHits: number }>(
      "POST",
      `/indexes/${this.index}/search`,
      body,
    );
  }

  private async setupIndex(): Promise<void> {
    try {
      await this.request("PATCH", `/indexes/${this.index}/settings`, {
        searchableAttributes: ["name", "description", "fabric", "region", "tags", "occasion"],
        filterableAttributes: ["categoryId", "vendorId", "region", "fabric", "minPricePaise", "occasion"],
        sortableAttributes: ["minPricePaise", "searchIndexedAt"],
        typoTolerance: { enabled: true, minWordSizeForTypos: { oneTypo: 4, twoTypos: 8 } },
        synonyms: {
          saree: ["saari", "sari", "seere", "cheera"],
          kanjivaram: ["kanchipuram", "kanchi"],
          banarasi: ["banaras", "benares", "varanasi"],
        },
      });
    } catch (err) {
      this.logger.warn("Meilisearch setup failed — is it running?", err);
    }
  }

  private async request<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
    const init: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    };
    const res = await fetch(`${this.host}${path}`, init);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Meilisearch ${method} ${path} → ${res.status}: ${text}`);
    }
    const text = await res.text();
    return text ? (JSON.parse(text) as T) : ({} as T);
  }
}
