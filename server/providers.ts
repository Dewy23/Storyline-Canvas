import type { AIProvider } from "@shared/schema";

interface GenerationResult {
  success: boolean;
  mediaUrl?: string;
  error?: string;
  jobId?: string;
}

interface JobStatus {
  status: "pending" | "processing" | "completed" | "failed";
  mediaUrl?: string;
  error?: string;
  progress?: number;
}

const IMAGE_PROVIDERS = ["stability", "flux", "openai", "dalle3", "ideogram", "replicate"];
const VIDEO_PROVIDERS = ["runway", "kling", "pika", "luma", "replicate"];

export async function validateApiKey(provider: string, apiKey: string): Promise<{ valid: boolean; error?: string }> {
  try {
    switch (provider) {
      case "stability": {
        const response = await fetch("https://api.stability.ai/v1/user/account", {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (response.ok) return { valid: true };
        return { valid: false, error: "Invalid API key" };
      }
      
      case "openai":
      case "dalle3": {
        const response = await fetch("https://api.openai.com/v1/models", {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (response.ok) return { valid: true };
        return { valid: false, error: "Invalid API key" };
      }
      
      case "replicate":
      case "flux": {
        const response = await fetch("https://api.replicate.com/v1/account", {
          headers: { Authorization: `Token ${apiKey}` },
        });
        if (response.ok) return { valid: true };
        return { valid: false, error: "Invalid API key" };
      }
      
      case "runway": {
        const response = await fetch("https://api.runwayml.com/v1/tasks?limit=1", {
          headers: { 
            Authorization: `Bearer ${apiKey}`,
            "X-Runway-Version": "2024-11-06",
          },
        });
        if (response.ok || response.status === 401) {
          return { valid: response.ok };
        }
        return { valid: apiKey.length > 20 };
      }
      
      default:
        return { valid: apiKey.length > 10 };
    }
  } catch (error) {
    console.error(`[Provider] Validation error for ${provider}:`, error);
    return { valid: false, error: "Connection failed" };
  }
}

export async function generateImage(
  provider: string,
  prompt: string,
  apiKey: string,
  referenceImageUrl?: string
): Promise<GenerationResult> {
  if (!apiKey) {
    return { success: false, error: `No API key configured for ${provider}` };
  }

  try {
    switch (provider) {
      case "stability": {
        const response = await fetch("https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            text_prompts: [{ text: prompt, weight: 1 }],
            cfg_scale: 7,
            height: 1024,
            width: 1024,
            samples: 1,
            steps: 30,
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          console.error("[Stability] Error:", error);
          return { success: false, error: `Stability API error: ${response.status}` };
        }

        const data = await response.json();
        const base64Image = data.artifacts?.[0]?.base64;
        
        if (base64Image) {
          return {
            success: true,
            mediaUrl: `data:image/png;base64,${base64Image}`,
          };
        }
        return { success: false, error: "No image returned" };
      }

      case "openai":
      case "dalle3": {
        const response = await fetch("https://api.openai.com/v1/images/generations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "dall-e-3",
            prompt: prompt,
            n: 1,
            size: "1024x1024",
            quality: "standard",
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          console.error("[OpenAI] Error:", error);
          return { success: false, error: `OpenAI API error: ${response.status}` };
        }

        const data = await response.json();
        const imageUrl = data.data?.[0]?.url;
        
        if (imageUrl) {
          return { success: true, mediaUrl: imageUrl };
        }
        return { success: false, error: "No image returned" };
      }

      case "flux":
      case "replicate": {
        const response = await fetch("https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Token ${apiKey}`,
            "Prefer": "wait",
          },
          body: JSON.stringify({
            input: {
              prompt: prompt,
              num_outputs: 1,
              aspect_ratio: "16:9",
              output_format: "webp",
              output_quality: 80,
            },
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          console.error("[Replicate] Error:", error);
          return { success: false, error: `Replicate API error: ${response.status}` };
        }

        const prediction = await response.json();
        
        if (prediction.status === "succeeded" && prediction.output?.[0]) {
          return { success: true, mediaUrl: prediction.output[0] };
        }
        
        if (prediction.id) {
          return {
            success: true,
            jobId: prediction.id,
            mediaUrl: undefined,
          };
        }
        
        return { success: false, error: "No prediction ID returned" };
      }

      default:
        return { success: false, error: `Provider ${provider} not implemented` };
    }
  } catch (error) {
    console.error(`[${provider}] Generation error:`, error);
    return { success: false, error: `Generation failed: ${error}` };
  }
}

export async function generateVideo(
  provider: string,
  prompt: string,
  apiKey: string,
  referenceImageUrl?: string
): Promise<GenerationResult> {
  if (!apiKey) {
    return { success: false, error: `No API key configured for ${provider}` };
  }

  try {
    switch (provider) {
      case "runway": {
        if (!referenceImageUrl) {
          return { success: false, error: "Runway requires a reference image for image-to-video" };
        }
        
        const response = await fetch("https://api.runwayml.com/v1/image_to_video", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            "X-Runway-Version": "2024-11-06",
          },
          body: JSON.stringify({
            model: "gen3a_turbo",
            promptImage: referenceImageUrl,
            promptText: prompt,
            duration: 5,
            ratio: "16:9",
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          console.error("[Runway] Error:", error);
          return { success: false, error: `Runway API error: ${response.status}` };
        }

        const data = await response.json();
        
        return {
          success: true,
          jobId: data.id,
        };
      }

      case "replicate": {
        const modelInput: Record<string, unknown> = {
          prompt: prompt,
        };
        
        if (referenceImageUrl) {
          modelInput.image = referenceImageUrl;
        }

        const response = await fetch("https://api.replicate.com/v1/predictions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Token ${apiKey}`,
          },
          body: JSON.stringify({
            version: "stability-ai/stable-video-diffusion",
            input: modelInput,
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          console.error("[Replicate Video] Error:", error);
          return { success: false, error: `Replicate API error: ${response.status}` };
        }

        const prediction = await response.json();
        
        return {
          success: true,
          jobId: prediction.id,
        };
      }

      default:
        return { success: false, error: `Video provider ${provider} not implemented` };
    }
  } catch (error) {
    console.error(`[${provider}] Video generation error:`, error);
    return { success: false, error: `Video generation failed: ${error}` };
  }
}

export async function checkJobStatus(provider: string, jobId: string, apiKey: string): Promise<JobStatus> {
  if (!apiKey) {
    return { status: "failed", error: "No API key" };
  }

  try {
    switch (provider) {
      case "runway": {
        const response = await fetch(`https://api.runwayml.com/v1/tasks/${jobId}`, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "X-Runway-Version": "2024-11-06",
          },
        });

        if (!response.ok) {
          return { status: "failed", error: "Failed to check status" };
        }

        const data = await response.json();
        
        if (data.status === "SUCCEEDED") {
          return { status: "completed", mediaUrl: data.output?.[0] };
        } else if (data.status === "FAILED") {
          return { status: "failed", error: data.failure || "Generation failed" };
        } else {
          return { status: "processing", progress: data.progress };
        }
      }

      case "flux":
      case "replicate": {
        const response = await fetch(`https://api.replicate.com/v1/predictions/${jobId}`, {
          headers: {
            Authorization: `Token ${apiKey}`,
          },
        });

        if (!response.ok) {
          return { status: "failed", error: "Failed to check status" };
        }

        const data = await response.json();
        
        if (data.status === "succeeded") {
          const output = Array.isArray(data.output) ? data.output[0] : data.output;
          return { status: "completed", mediaUrl: output };
        } else if (data.status === "failed") {
          return { status: "failed", error: data.error || "Generation failed" };
        } else {
          return { status: "processing" };
        }
      }

      default:
        return { status: "failed", error: "Unknown provider" };
    }
  } catch (error) {
    console.error(`[${provider}] Job status error:`, error);
    return { status: "failed", error: `Status check failed: ${error}` };
  }
}

const jobStore = new Map<string, { provider: string; jobId: string; tileId: string; type: "image" | "video" }>();

export function storeJob(tileId: string, provider: string, jobId: string, type: "image" | "video"): void {
  jobStore.set(tileId, { provider, jobId, tileId, type });
}

export function getJob(tileId: string) {
  return jobStore.get(tileId);
}

export function removeJob(tileId: string): void {
  jobStore.delete(tileId);
}
