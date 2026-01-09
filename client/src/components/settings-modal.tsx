import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Check, X, Loader2, Image, Video, Volume2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppStore } from "@/lib/store";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { AIProvider, APISetting } from "@shared/schema";
import { SiOpenai, SiGoogle, SiAdobe } from "react-icons/si";

interface ProviderConfig {
  id: AIProvider;
  name: string;
  description: string;
  docUrl?: string;
}

const imageProviders: ProviderConfig[] = [
  { id: "openai", name: "OpenAI (DALL-E / GPT Image)", description: "DALL-E 3 and GPT-4 Vision image generation", docUrl: "https://platform.openai.com/api-keys" },
  { id: "gemini", name: "Google Gemini", description: "Google's Gemini multimodal AI for image generation", docUrl: "https://aistudio.google.com/apikey" },
  { id: "stability", name: "Stability AI", description: "Stable Diffusion XL and other models", docUrl: "https://platform.stability.ai/account/keys" },
  { id: "flux", name: "Flux (Black Forest Labs)", description: "Fast, high-quality image generation via Replicate", docUrl: "https://replicate.com/account/api-tokens" },
  { id: "ideogram", name: "Ideogram", description: "AI image generation with excellent text rendering", docUrl: "https://ideogram.ai/manage-api" },
  { id: "hunyuan", name: "Hunyuan (Tencent)", description: "Tencent's AI image generation model", docUrl: "https://cloud.tencent.com/product/hunyuan" },
  { id: "firefly", name: "Adobe Firefly", description: "Adobe's creative AI for image generation", docUrl: "https://developer.adobe.com/firefly-api/api/" },
  { id: "bria", name: "Bria.ai", description: "Enterprise AI for visual content generation", docUrl: "https://bria.ai/api" },
  { id: "pollinations", name: "Pollinations.ai", description: "Open-source AI image generation", docUrl: "https://pollinations.ai" },
  { id: "runware", name: "Runware", description: "Fast AI image generation API", docUrl: "https://runware.ai" },
];

const videoProviders: ProviderConfig[] = [
  { id: "runway", name: "Runway ML", description: "Gen-3 Alpha video generation and editing", docUrl: "https://app.runwayml.com/settings/api" },
  { id: "veo", name: "Google Veo", description: "Google's AI video generation model (coming soon)", docUrl: "https://cloud.google.com/vertex-ai" },
  { id: "kling", name: "Kling (WaveSpeedAI)", description: "High-quality AI video generation (coming soon)", docUrl: "https://wavespeed.ai" },
  { id: "pika", name: "Pika Labs", description: "Creative AI video generation (coming soon)", docUrl: "https://pika.art" },
  { id: "luma", name: "Luma Dream Machine", description: "AI-powered video and 3D generation", docUrl: "https://lumalabs.ai" },
  { id: "tavus", name: "Tavus", description: "AI video personalization (coming soon)", docUrl: "https://www.tavus.io" },
  { id: "mootion", name: "Mootion", description: "AI motion and video (coming soon)", docUrl: "https://mootion.ai" },
  { id: "akool", name: "Akool", description: "AI video creation (coming soon)", docUrl: "https://akool.com" },
  { id: "mirage", name: "Mirage", description: "AI video generation (coming soon)", docUrl: "https://mirage.ai" },
  { id: "pictory", name: "Pictory", description: "AI video from text (coming soon)", docUrl: "https://pictory.ai" },
];

const audioProviders: ProviderConfig[] = [
  { id: "elevenlabs", name: "ElevenLabs", description: "AI voice and audio generation", docUrl: "https://elevenlabs.io/app/settings/api-keys" },
];

function getProviderIcon(providerId: AIProvider) {
  switch (providerId) {
    case "openai":
      return <SiOpenai className="w-5 h-5" />;
    case "gemini":
    case "veo":
      return <SiGoogle className="w-5 h-5" />;
    case "firefly":
      return <SiAdobe className="w-5 h-5" />;
    default:
      return null;
  }
}

interface ProviderRowProps {
  provider: ProviderConfig;
  apiSettings: APISetting[];
  editingKeys: Record<string, string>;
  showKeys: Record<string, boolean>;
  onKeyChange: (provider: AIProvider, value: string) => void;
  onToggleShowKey: (provider: AIProvider) => void;
  onSave: (provider: AIProvider) => void;
  onDisconnect: (provider: AIProvider) => void;
  isSaving: boolean;
  isDeleting: boolean;
}

function ProviderRow({
  provider,
  apiSettings,
  editingKeys,
  showKeys,
  onKeyChange,
  onToggleShowKey,
  onSave,
  onDisconnect,
  isSaving,
  isDeleting,
}: ProviderRowProps) {
  const setting = apiSettings.find((s) => s.provider === provider.id);
  const isConnected = setting?.isConnected ?? false;
  const currentKey = editingKeys[provider.id] ?? setting?.apiKey ?? "";
  const icon = getProviderIcon(provider.id);

  return (
    <div
      className="p-3 border rounded-md space-y-2"
      data-testid={`provider-section-${provider.id}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center text-muted-foreground shrink-0">
            {icon || (
              <span className="text-xs font-semibold">
                {provider.name.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">{provider.name}</span>
              {isConnected && (
                <Badge variant="secondary" className="gap-1 bg-green-500/10 text-green-600 dark:text-green-400 text-xs">
                  <Check className="w-3 h-3" />
                  Connected
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {provider.description}
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            type={showKeys[provider.id] ? "text" : "password"}
            placeholder="Enter API key..."
            value={currentKey}
            onChange={(e) => onKeyChange(provider.id, e.target.value)}
            className="pr-10 font-mono text-xs h-9"
            data-testid={`input-api-key-${provider.id}`}
          />
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={() => onToggleShowKey(provider.id)}
            data-testid={`button-toggle-visibility-${provider.id}`}
          >
            {showKeys[provider.id] ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </Button>
        </div>
        {isConnected ? (
          <Button
            variant="outline"
            size="default"
            onClick={() => onDisconnect(provider.id)}
            disabled={isDeleting}
            data-testid={`button-disconnect-${provider.id}`}
          >
            {isDeleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <X className="w-4 h-4 mr-1" />
                Disconnect
              </>
            )}
          </Button>
        ) : (
          <Button
            onClick={() => onSave(provider.id)}
            disabled={!editingKeys[provider.id] || isSaving}
            data-testid={`button-save-${provider.id}`}
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Save"
            )}
          </Button>
        )}
      </div>
      {provider.docUrl && (
        <a
          href={provider.docUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-foreground underline"
        >
          Get API key
        </a>
      )}
    </div>
  );
}

export function SettingsModal() {
  const { isSettingsOpen, setSettingsOpen, apiSettings, updateApiSetting } = useAppStore();
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [editingKeys, setEditingKeys] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const saveSettingMutation = useMutation({
    mutationFn: async (data: { provider: AIProvider; apiKey: string }) => {
      const response = await apiRequest("POST", "/api/settings", data);
      return response.json() as Promise<APISetting>;
    },
    onSuccess: (savedSetting) => {
      updateApiSetting(savedSetting.provider, {
        apiKey: savedSetting.apiKey,
        isConnected: savedSetting.isConnected,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
  });

  const deleteSettingMutation = useMutation({
    mutationFn: (provider: AIProvider) => 
      apiRequest("DELETE", `/api/settings/${provider}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
  });

  const toggleShowKey = (provider: AIProvider) => {
    setShowKeys((prev) => ({ ...prev, [provider]: !prev[provider] }));
  };

  const handleKeyChange = (provider: AIProvider, value: string) => {
    setEditingKeys((prev) => ({ ...prev, [provider]: value }));
  };

  const handleSaveKey = async (provider: AIProvider) => {
    const key = editingKeys[provider];
    if (!key) return;

    saveSettingMutation.mutate({ provider, apiKey: key }, {
      onSuccess: (savedSetting) => {
        setEditingKeys((prev) => {
          const newState = { ...prev };
          delete newState[provider];
          return newState;
        });
        
        const providerName = [...imageProviders, ...videoProviders].find((p) => p.id === provider)?.name || provider;
        
        if (savedSetting.isConnected) {
          toast({
            title: "API key saved",
            description: `${providerName} connected successfully`,
          });
        } else {
          toast({
            title: "API key saved",
            description: `${providerName} key saved (validation pending)`,
          });
        }
      },
      onError: () => {
        toast({
          title: "Failed to save API key",
          description: "Please check your key and try again",
          variant: "destructive",
        });
      }
    });
  };

  const handleDisconnect = (provider: AIProvider) => {
    deleteSettingMutation.mutate(provider, {
      onSuccess: () => {
        updateApiSetting(provider, {
          apiKey: "",
          isConnected: false,
        });
        setEditingKeys((prev) => {
          const newState = { ...prev };
          delete newState[provider];
          return newState;
        });
        
        const providerName = [...imageProviders, ...videoProviders].find((p) => p.id === provider)?.name || provider;
        toast({
          title: "Disconnected",
          description: `${providerName} has been disconnected`,
        });
      }
    });
  };

  const connectedImageCount = imageProviders.filter(p => 
    apiSettings.some(s => s.provider === p.id && s.isConnected)
  ).length;
  
  const connectedVideoCount = videoProviders.filter(p => 
    apiSettings.some(s => s.provider === p.id && s.isConnected)
  ).length;
  
  const connectedAudioCount = audioProviders.filter(p => 
    apiSettings.some(s => s.provider === p.id && s.isConnected)
  ).length;

  return (
    <Dialog open={isSettingsOpen} onOpenChange={setSettingsOpen}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Settings</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Configure your AI provider API keys for image and video generation
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="image-providers" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="image-providers" className="gap-1" data-testid="settings-tab-image-providers">
              <Image className="w-4 h-4" />
              Image
              {connectedImageCount > 0 && (
                <Badge variant="secondary" className="ml-1 bg-green-500/10 text-green-600 dark:text-green-400 text-xs">
                  {connectedImageCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="video-providers" className="gap-1" data-testid="settings-tab-video-providers">
              <Video className="w-4 h-4" />
              Video
              {connectedVideoCount > 0 && (
                <Badge variant="secondary" className="ml-1 bg-green-500/10 text-green-600 dark:text-green-400 text-xs">
                  {connectedVideoCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="audio-providers" className="gap-1" data-testid="settings-tab-audio-providers">
              <Volume2 className="w-4 h-4" />
              Audio
              {connectedAudioCount > 0 && (
                <Badge variant="secondary" className="ml-1 bg-green-500/10 text-green-600 dark:text-green-400 text-xs">
                  {connectedAudioCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="image-providers" className="flex-1 overflow-hidden mt-4">
            <ScrollArea className="h-[50vh]">
              <div className="space-y-3 pr-4">
                {imageProviders.map((provider) => (
                  <ProviderRow
                    key={provider.id}
                    provider={provider}
                    apiSettings={apiSettings}
                    editingKeys={editingKeys}
                    showKeys={showKeys}
                    onKeyChange={handleKeyChange}
                    onToggleShowKey={toggleShowKey}
                    onSave={handleSaveKey}
                    onDisconnect={handleDisconnect}
                    isSaving={saveSettingMutation.isPending}
                    isDeleting={deleteSettingMutation.isPending}
                  />
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="video-providers" className="flex-1 overflow-hidden mt-4">
            <ScrollArea className="h-[50vh]">
              <div className="space-y-3 pr-4">
                {videoProviders.map((provider) => (
                  <ProviderRow
                    key={provider.id}
                    provider={provider}
                    apiSettings={apiSettings}
                    editingKeys={editingKeys}
                    showKeys={showKeys}
                    onKeyChange={handleKeyChange}
                    onToggleShowKey={toggleShowKey}
                    onSave={handleSaveKey}
                    onDisconnect={handleDisconnect}
                    isSaving={saveSettingMutation.isPending}
                    isDeleting={deleteSettingMutation.isPending}
                  />
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="audio-providers" className="flex-1 overflow-hidden mt-4">
            <ScrollArea className="h-[50vh]">
              <div className="space-y-3 pr-4">
                {audioProviders.map((provider) => (
                  <ProviderRow
                    key={provider.id}
                    provider={provider}
                    apiSettings={apiSettings}
                    editingKeys={editingKeys}
                    showKeys={showKeys}
                    onKeyChange={handleKeyChange}
                    onToggleShowKey={toggleShowKey}
                    onSave={handleSaveKey}
                    onDisconnect={handleDisconnect}
                    isSaving={saveSettingMutation.isPending}
                    isDeleting={deleteSettingMutation.isPending}
                  />
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
