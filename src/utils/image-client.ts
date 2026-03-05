import OpenAI, { AzureOpenAI } from "openai";
import type { ProviderConfig, AzureConfig } from "./config.js";

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
 * Decodes a base64 string into a Uint8Array.
 */
function decodeBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Client for OpenAI / Azure OpenAI image generation and editing.
 * Automatically selects the correct SDK client based on ProviderConfig.
 */
export class ImageClient {
  private client: OpenAI;
  private config: ProviderConfig;
  private imageModel: string;

  constructor(config: ProviderConfig) {
    this.config = config;
    if (config.provider === "azure") {
      this.client = new AzureOpenAI({
        endpoint: config.endpoint,
        apiKey: config.apiKey,
        apiVersion: config.imageApiVersion,
        deployment: config.imageDeploymentName,
      });
      this.imageModel = config.imageDeploymentName;
    } else {
      this.client = new OpenAI({ apiKey: config.apiKey });
      this.imageModel = config.imageModel;
    }
  }

  /**
   * Generates an image from a text prompt.
   * Returns raw image bytes as a Uint8Array.
   */
  async generateImage(prompt: string, options: GenerateImageOptions): Promise<Uint8Array> {
    const { size = "1024x1024", quality = "high" } = options;

    try {
      const response = await this.client.images.generate({
        model: this.imageModel,
        prompt,
        n: 1,
        size,
        quality,
        output_format: "png",
      });

      if (!response.data || response.data.length === 0 || !response.data[0].b64_json) {
        throw new Error("画像データが見つかりません");
      }

      return decodeBase64(response.data[0].b64_json);
    } catch (error) {
      if (error instanceof Error && error.message === "画像データが見つかりません") throw error;
      throw new Error(
        `画像生成に失敗しました: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Edits an existing image.
   * Azure: REST API (SDK's img2img is unreliable).
   * OpenAI: SDK images.edit().
   * Returns raw image bytes as a Uint8Array.
   */
  async editImage(
    imageBuffer: Buffer,
    prompt: string,
    options: EditImageOptions = {}
  ): Promise<Uint8Array> {
    const { size = "1024x1024" } = options;

    if (this.config.provider === "azure") {
      return this.editImageAzure(imageBuffer, prompt, size, this.config);
    }
    return this.editImageOpenAI(imageBuffer, prompt, size);
  }

  private async editImageOpenAI(
    imageBuffer: Buffer,
    prompt: string,
    size: string
  ): Promise<Uint8Array> {
    try {
      const file = new File([imageBuffer], "image.png", { type: "image/png" });
      const response = await this.client.images.edit({
        model: this.imageModel,
        image: file,
        prompt,
        size: size as ImageSize,
      });

      if (!response.data || response.data.length === 0 || !response.data[0].b64_json) {
        throw new Error("画像データが見つかりません");
      }

      return decodeBase64(response.data[0].b64_json);
    } catch (error) {
      if (error instanceof Error && error.message === "画像データが見つかりません") throw error;
      throw new Error(
        `画像編集に失敗しました: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async editImageAzure(
    imageBuffer: Buffer,
    prompt: string,
    size: string,
    config: AzureConfig
  ): Promise<Uint8Array> {
    const url =
      `${config.endpoint}/openai/deployments/${config.imageDeploymentName}` +
      `/images/edits?api-version=${config.imageApiVersion}`;

    const blob = new Blob([imageBuffer], { type: "image/png" });
    const formData = new FormData();
    formData.append("image", blob, "image.png");
    formData.append("prompt", prompt);
    formData.append("size", size);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "api-key": config.apiKey },
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

      return decodeBase64(json.data[0].b64_json);
    } catch (error) {
      if (error instanceof Error && error.message === "画像データが見つかりません") throw error;
      throw new Error(
        `画像編集に失敗しました: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
