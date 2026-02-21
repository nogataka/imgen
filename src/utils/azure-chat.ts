import { AzureOpenAI } from "openai";
import type { AzureConfig } from "./config.js";
import type { ImageData } from "./image.js";
import { Logger } from "./logger.js";

/**
 * Client for Azure OpenAI Chat Completions API.
 * Provides methods to generate image prompts, file names, and image explanations
 * using a chat model (e.g. gpt-5.1).
 */
export class AzureChatClient {
  private client: AzureOpenAI;
  private deploymentName: string;
  private logger: Logger;

  constructor(config: AzureConfig) {
    this.client = new AzureOpenAI({
      endpoint: config.endpoint,
      apiKey: config.apiKey,
      apiVersion: config.apiVersion,
      deployment: config.deploymentName,
    });
    this.deploymentName = config.deploymentName;
    this.logger = Logger.getInstance({ name: "azure-chat" });
  }

  /**
   * Generates a detailed image-generation prompt from a short theme description.
   * Optionally accepts additional context to guide prompt generation.
   */
  async generatePrompt(theme: string, context = ""): Promise<string> {
    if (!theme) throw new Error("テーマが空です");

    const prompt = `
Generate a detailed image generation prompt based on the following information.

Theme: ${theme}
${context ? `Context:\n${context}\n` : ""}
Please generate a prompt that meets the following criteria:
1. Include specific and detailed descriptions
2. Clearly specify the image style and atmosphere
3. Include all necessary elements
4. Output in English
5. Focus on visual elements and composition
6. Include lighting and color descriptions
7. Specify the mood and emotional tone
8. Limit the output to approximately 1500 characters

Prompt:
`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.deploymentName,
        messages: [{ role: "user", content: prompt }],
      });
      return response.choices[0]?.message?.content ?? "";
    } catch (error) {
      this.logger.error("プロンプト生成に失敗しました", { error });
      throw new Error("プロンプトの生成に失敗しました");
    }
  }

  /**
   * Generates a sanitized file name (lowercase alphanumeric + hyphens only) from a theme.
   */
  async generateFileName(theme: string, maxLength = 40): Promise<string> {
    if (!theme) throw new Error("テーマが空です");

    try {
      const response = await this.client.chat.completions.create({
        model: this.deploymentName,
        messages: [
          {
            role: "user",
            content: `以下のテーマから画像のファイル名を生成してください。英小文字とハイフンのみ、${maxLength}文字以内。拡張子なし。\n\nテーマ: ${theme}\n\nファイル名:`,
          },
        ],
      });

      let fileName = (response.choices[0]?.message?.content ?? "").trim();
      fileName = fileName
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
      if (fileName.length > maxLength) fileName = fileName.substring(0, maxLength);
      return fileName || "image";
    } catch (error) {
      this.logger.error("ファイル名生成に失敗しました", { error });
      throw new Error("ファイル名の生成に失敗しました");
    }
  }

  /**
   * Generates a detailed explanation of an image using multimodal (vision) input.
   * The explanation language is controlled by the `lang` parameter.
   */
  async generateExplanation(imageData: ImageData, lang = "ja", context?: string): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.deploymentName,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: `data:${imageData.mimeType};base64,${imageData.data}` },
              },
              {
                type: "text",
                text: `この画像について、${lang}で詳細な説明を生成してください。${context ? `\n\nコンテキスト情報:\n${context}` : ""}`,
              },
            ],
          },
        ],
      });
      return response.choices[0]?.message?.content ?? "";
    } catch (error) {
      this.logger.error("画像説明の生成に失敗しました", { error });
      throw new Error("画像の説明生成に失敗しました");
    }
  }
}
