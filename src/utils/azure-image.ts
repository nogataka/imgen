import { AzureOpenAI } from "openai";
import type { AzureConfig } from "./config.js";
import { Logger } from "./logger.js";

export type ImageSize = "1024x1024" | "1536x1024" | "1024x1536";
export type ImageQuality = "low" | "medium" | "high";
export interface GenerateImageOptions {
  size?: ImageSize;
  quality?: ImageQuality;
}

export interface EditImageOptions {
  size?: ImageSize;
}

/**
 * Client for Azure OpenAI Image generation and editing.
 * Uses the SDK (`AzureOpenAI`) for `generateImage` and the REST API directly
 * for `editImage`, because the Azure SDK's img2img support is unreliable.
 */
export class AzureImageClient {
  private client: AzureOpenAI;
  private config: AzureConfig;
  private logger: Logger;

  constructor(config: AzureConfig) {
    this.config = config;
    this.client = new AzureOpenAI({
      endpoint: config.endpoint,
      apiKey: config.apiKey,
      apiVersion: config.imageApiVersion,
      deployment: config.imageDeploymentName,
    });
    this.logger = Logger.getInstance({ name: "azure-image" });
  }

  /**
   * Generates an image from a text prompt using the Azure OpenAI SDK.
   * Returns raw image bytes as a Uint8Array.
   */
  async generateImage(prompt: string, options: GenerateImageOptions): Promise<Uint8Array> {
    const { size = "1024x1024", quality = "high" } = options;

    this.logger.debug("画像生成リクエスト", { prompt: prompt.substring(0, 100), size, quality });

    try {
      const response = await this.client.images.generate({
        model: this.config.imageDeploymentName,
        prompt,
        n: 1,
        size,
        quality,
        output_format: "png",
      });

      if (!response.data || response.data.length === 0 || !response.data[0].b64_json) {
        throw new Error("画像データが見つかりません");
      }

      const b64 = response.data[0].b64_json;
      const binary = atob(b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    } catch (error) {
      if (error instanceof Error && error.message === "画像データが見つかりません") throw error;
      this.logger.error("画像生成に失敗しました", { error });
      throw new Error(
        `画像生成に失敗しました: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Edits an existing image using the Azure OpenAI REST API.
   * Uses fetch + FormData because the SDK's image editing support is unreliable.
   * Returns raw image bytes as a Uint8Array.
   */
  async editImage(
    imageBuffer: Buffer,
    prompt: string,
    options: EditImageOptions = {}
  ): Promise<Uint8Array> {
    const { size = "1024x1024" } = options;

    this.logger.debug("画像編集リクエスト (REST API)", { prompt: prompt.substring(0, 100), size });

    const url =
      `${this.config.endpoint}/openai/deployments/${this.config.imageDeploymentName}` +
      `/images/edits?api-version=${this.config.imageApiVersion}`;

    const blob = new Blob([imageBuffer], { type: "image/png" });
    const formData = new FormData();
    formData.append("image", blob, "image.png");
    formData.append("prompt", prompt);
    formData.append("size", size);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "api-key": this.config.apiKey },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Azure API error (${response.status}): ${errorText}`);
      }

      const json = (await response.json()) as { data?: { b64_json?: string }[] };

      if (!json.data || json.data.length === 0 || !json.data[0].b64_json) {
        throw new Error("画像データが見つかりません");
      }

      const b64 = json.data[0].b64_json;
      const binary = atob(b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    } catch (error) {
      if (error instanceof Error && error.message === "画像データが見つかりません") throw error;
      this.logger.error("画像編集に失敗しました", { error });
      throw new Error(
        `画像編集に失敗しました: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
