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

// Provider categorization
export const IMAGE_PROVIDERS = ["huggingface", "replicate", "pollinations", "openai", "gemini", "stability", "flux", "ideogram", "hunyuan", "firefly", "bria", "runware", "dalle3"];
export const VIDEO_PROVIDERS = ["runway", "veo", "kling", "pika", "luma", "tavus", "mootion", "akool", "mirage", "pictory", "replicate"];

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
      
      case "gemini": {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`);
        if (response.ok) return { valid: true };
        return { valid: false, error: "Invalid API key" };
      }
      
      case "huggingface": {
        const response = await fetch("https://huggingface.co/api/whoami-v2", {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (response.ok) return { valid: true };
        return { valid: false, error: "Invalid Hugging Face token" };
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
        if (response.ok) return { valid: true };
        if (response.status === 401) return { valid: false, error: "Invalid API key" };
        return { valid: apiKey.length > 20 };
      }
      
      case "ideogram": {
        const response = await fetch("https://api.ideogram.ai/describe", {
          method: "POST",
          headers: {
            "Api-Key": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ image_url: "https://via.placeholder.com/1" }),
        });
        if (response.status === 401 || response.status === 403) {
          return { valid: false, error: "Invalid API key" };
        }
        return { valid: true };
      }
      
      // Providers that need basic validation (no public validation endpoint)
      case "hunyuan":
      case "firefly":
      case "bria":
      case "pollinations":
      case "runware":
      case "veo":
      case "kling":
      case "pika":
      case "luma":
      case "tavus":
      case "mootion":
      case "akool":
      case "mirage":
      case "pictory":
        // Basic validation - key exists and has reasonable length
        if (apiKey.length >= 10) {
          return { valid: true };
        }
        return { valid: false, error: "API key too short" };
      
      default:
        return { valid: apiKey.length > 10 };
    }
  } catch (error) {
    console.error(`[Provider] Validation error for ${provider}:`, error);
    return { valid: false, error: "Connection failed" };
  }
}

// Free providers that don't require API keys
const FREE_IMAGE_PROVIDERS = ["pollinations"];

export async function generateImage(
  provider: string,
  prompt: string,
  apiKey: string,
  referenceImageUrl?: string
): Promise<GenerationResult> {
  // Free providers don't need API keys
  if (!apiKey && !FREE_IMAGE_PROVIDERS.includes(provider)) {
    return { success: false, error: `No API key configured for ${provider}` };
  }

  console.log(`[Provider] Generating image with ${provider}`);

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

      case "gemini": {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{
                parts: [{ text: `Generate an image: ${prompt}` }]
              }],
              generationConfig: {
                responseModalities: ["TEXT", "IMAGE"]
              }
            }),
          }
        );

        if (!response.ok) {
          const error = await response.text();
          console.error("[Gemini] Error:", error);
          return { success: false, error: `Gemini API error: ${response.status}` };
        }

        const data = await response.json();
        const imagePart = data.candidates?.[0]?.content?.parts?.find((p: { inlineData?: { mimeType: string; data: string } }) => p.inlineData);
        
        if (imagePart?.inlineData) {
          return {
            success: true,
            mediaUrl: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`,
          };
        }
        return { success: false, error: "No image returned from Gemini" };
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

      case "ideogram": {
        const response = await fetch("https://api.ideogram.ai/generate", {
          method: "POST",
          headers: {
            "Api-Key": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            image_request: {
              prompt: prompt,
              aspect_ratio: "ASPECT_16_9",
              model: "V_2",
              magic_prompt_option: "AUTO",
            },
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          console.error("[Ideogram] Error:", error);
          return { success: false, error: `Ideogram API error: ${response.status}` };
        }

        const data = await response.json();
        const imageUrl = data.data?.[0]?.url;
        
        if (imageUrl) {
          return { success: true, mediaUrl: imageUrl };
        }
        return { success: false, error: "No image returned" };
      }

      case "pollinations": {
        // Pollinations has a simple URL-based API - no key required
        const encodedPrompt = encodeURIComponent(prompt);
        const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true`;
        return { success: true, mediaUrl: imageUrl };
      }

      case "huggingface": {
        // Use FLUX.1-schnell model from Black Forest Labs (fast and high quality)
        const modelId = "black-forest-labs/FLUX.1-schnell";
        const response = await fetch(`https://api-inference.huggingface.co/models/${modelId}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "X-Wait-For-Model": "true", // Wait for model to load if cold
          },
          body: JSON.stringify({
            inputs: prompt,
            parameters: {
              width: 1024,
              height: 1024,
            },
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("[HuggingFace] Error:", response.status, errorText);
          
          // Handle model loading (503 error)
          if (response.status === 503) {
            return { success: false, error: "Model is loading, please try again in a moment" };
          }
          if (response.status === 401) {
            return { success: false, error: "Invalid Hugging Face token" };
          }
          return { success: false, error: `Hugging Face API error: ${response.status}` };
        }

        // Response is binary image data
        const buffer = await response.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        return {
          success: true,
          mediaUrl: `data:image/png;base64,${base64}`,
        };
      }

      default:
        // Handle unimplemented providers gracefully
        return { 
          success: false, 
          error: `${provider} integration is not yet available. Try: Hugging Face, Replicate, Pollinations (free), OpenAI, Gemini, or Stability AI.` 
        };
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

  console.log(`[Provider] Generating video with ${provider}, reference: ${referenceImageUrl ? 'yes' : 'no'}`);

  try {
    switch (provider) {
      case "runway": {
        if (!referenceImageUrl) {
          return { success: false, error: "Runway requires a reference image for image-to-video generation" };
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

        const response = await fetch("https://api.replicate.com/v1/models/stability-ai/stable-video-diffusion/predictions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Token ${apiKey}`,
            "Prefer": "wait=60",
          },
          body: JSON.stringify({
            input: modelInput,
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          console.error("[Replicate Video] Error:", error);
          return { success: false, error: `Replicate API error: ${response.status}` };
        }

        const prediction = await response.json();
        
        if (prediction.status === "succeeded" && prediction.output) {
          const outputUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
          return { success: true, mediaUrl: outputUrl };
        }
        
        return {
          success: true,
          jobId: prediction.id,
        };
      }

      case "luma": {
        const response = await fetch("https://api.lumalabs.ai/dream-machine/v1/generations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            prompt: prompt,
            keyframes: referenceImageUrl ? {
              frame0: { type: "image", url: referenceImageUrl }
            } : undefined,
            aspect_ratio: "16:9",
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          console.error("[Luma] Error:", error);
          return { success: false, error: `Luma API error: ${response.status}` };
        }

        const data = await response.json();
        return { success: true, jobId: data.id };
      }

      case "veo": {
        // Google Veo uses the Gemini API with video generation capability
        // Using veo-2.0-generate-001 model for video generation
        const requestBody: Record<string, unknown> = {
          contents: [{
            role: "user",
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            responseModalities: ["VIDEO"],
            videoDurationSeconds: 5
          }
        };

        // If reference image provided, include it for image-to-video
        if (referenceImageUrl) {
          const parts: Array<Record<string, unknown>> = [{ text: prompt }];
          
          // Check if it's a base64 data URL or a regular URL
          if (referenceImageUrl.startsWith('data:')) {
            const matches = referenceImageUrl.match(/^data:([^;]+);base64,(.+)$/);
            if (matches) {
              parts.unshift({
                inlineData: {
                  mimeType: matches[1],
                  data: matches[2]
                }
              });
            }
          } else {
            // For regular URLs, try to fetch and convert to base64
            try {
              const imgResponse = await fetch(referenceImageUrl);
              if (imgResponse.ok) {
                const buffer = await imgResponse.arrayBuffer();
                const base64 = Buffer.from(buffer).toString('base64');
                const contentType = imgResponse.headers.get('content-type') || 'image/jpeg';
                parts.unshift({
                  inlineData: {
                    mimeType: contentType,
                    data: base64
                  }
                });
              }
            } catch (e) {
              console.warn("[Veo] Could not fetch reference image:", e);
            }
          }
          
          (requestBody.contents as Array<{role: string; parts: Array<Record<string, unknown>>}>)[0].parts = parts;
        }

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/veo-2.0-generate-001:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
          }
        );

        if (!response.ok) {
          const error = await response.text();
          console.error("[Veo] Error:", error);
          
          // Check for specific error messages
          if (error.includes("not found") || error.includes("does not exist")) {
            return { 
              success: false, 
              error: "Veo model not available. Please ensure you have access to Google's Veo API." 
            };
          }
          
          return { success: false, error: `Veo API error: ${response.status}` };
        }

        const data = await response.json();
        console.log("[Veo] Response:", JSON.stringify(data, null, 2));
        
        // Check for video in response
        const videoPart = data.candidates?.[0]?.content?.parts?.find(
          (p: { video?: { uri?: string }; fileData?: { fileUri?: string } }) => p.video || p.fileData
        );
        
        if (videoPart?.video?.uri) {
          return { success: true, mediaUrl: videoPart.video.uri };
        }
        
        if (videoPart?.fileData?.fileUri) {
          return { success: true, mediaUrl: videoPart.fileData.fileUri };
        }

        // Check for inline video data
        const inlineVideo = data.candidates?.[0]?.content?.parts?.find(
          (p: { inlineData?: { mimeType: string; data: string } }) => 
            p.inlineData?.mimeType?.startsWith('video/')
        );
        
        if (inlineVideo?.inlineData) {
          return {
            success: true,
            mediaUrl: `data:${inlineVideo.inlineData.mimeType};base64,${inlineVideo.inlineData.data}`,
          };
        }

        // If we get a name/operation for async job
        if (data.name) {
          return { success: true, jobId: data.name };
        }

        return { success: false, error: "No video returned from Veo. The model may not support direct video generation yet." };
      }

      case "kling": {
        // Kling AI video generation via their API
        const response = await fetch("https://api.klingai.com/v1/videos/text2video", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            prompt: prompt,
            negative_prompt: "",
            cfg_scale: 0.5,
            mode: "std",
            aspect_ratio: "16:9",
            duration: "5",
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          console.error("[Kling] Error:", error);
          return { success: false, error: `Kling API error: ${response.status}` };
        }

        const data = await response.json();
        
        if (data.data?.task_id) {
          return { success: true, jobId: data.data.task_id };
        }
        
        return { success: false, error: "No task ID returned from Kling" };
      }

      default:
        // Handle unimplemented providers gracefully
        return { 
          success: false, 
          error: `${provider} video integration is not yet available. Please use Runway or Luma for video generation.` 
        };
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

      case "luma": {
        const response = await fetch(`https://api.lumalabs.ai/dream-machine/v1/generations/${jobId}`, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        });

        if (!response.ok) {
          return { status: "failed", error: "Failed to check status" };
        }

        const data = await response.json();
        
        if (data.state === "completed") {
          return { status: "completed", mediaUrl: data.assets?.video };
        } else if (data.state === "failed") {
          return { status: "failed", error: data.failure_reason || "Generation failed" };
        } else {
          return { status: "processing" };
        }
      }

      case "veo": {
        // Google Veo job status check via operations API
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/${jobId}?key=${apiKey}`,
          {
            headers: { "Content-Type": "application/json" },
          }
        );

        if (!response.ok) {
          return { status: "failed", error: "Failed to check Veo status" };
        }

        const data = await response.json();
        
        if (data.done) {
          if (data.error) {
            return { status: "failed", error: data.error.message || "Veo generation failed" };
          }
          
          // Extract video URL from response
          const videoPart = data.response?.candidates?.[0]?.content?.parts?.find(
            (p: { video?: { uri?: string }; fileData?: { fileUri?: string } }) => p.video || p.fileData
          );
          
          if (videoPart?.video?.uri) {
            return { status: "completed", mediaUrl: videoPart.video.uri };
          }
          if (videoPart?.fileData?.fileUri) {
            return { status: "completed", mediaUrl: videoPart.fileData.fileUri };
          }
          
          return { status: "failed", error: "No video in Veo response" };
        }
        
        return { status: "processing", progress: data.metadata?.progress };
      }

      case "kling": {
        // Kling job status check
        const response = await fetch(`https://api.klingai.com/v1/videos/text2video/${jobId}`, {
          headers: {
            "Authorization": `Bearer ${apiKey}`,
          },
        });

        if (!response.ok) {
          return { status: "failed", error: "Failed to check Kling status" };
        }

        const data = await response.json();
        
        if (data.data?.task_status === "succeed") {
          return { status: "completed", mediaUrl: data.data.task_result?.videos?.[0]?.url };
        } else if (data.data?.task_status === "failed") {
          return { status: "failed", error: data.data.task_status_msg || "Kling generation failed" };
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
