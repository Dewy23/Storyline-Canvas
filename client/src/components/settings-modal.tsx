import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Check, X, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/lib/store";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { AIProvider, APISetting } from "@shared/schema";
import { SiOpenai } from "react-icons/si";

interface ProviderConfig {
  id: AIProvider;
  name: string;
  description: string;
  type: "image" | "video" | "audio" | "multi";
}

const providers: ProviderConfig[] = [
  { id: "stability", name: "Stability AI", description: "Stable Diffusion image generation", type: "image" },
  { id: "flux", name: "Flux", description: "Fast image generation", type: "image" },
  { id: "openai", name: "OpenAI", description: "DALL-E image generation", type: "image" },
  { id: "runway", name: "Runway", description: "Video generation and editing", type: "video" },
  { id: "kling", name: "Kling", description: "AI video generation", type: "video" },
  { id: "replicate", name: "Replicate", description: "Multi-model platform", type: "multi" },
  { id: "elevenlabs", name: "ElevenLabs", description: "AI voice and audio generation", type: "audio" },
];

export function SettingsModal() {
  const { isSettingsOpen, setSettingsOpen, apiSettings, updateApiSetting, setApiSettings } = useAppStore();
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

  const getApiKey = (provider: AIProvider): string => {
    const setting = apiSettings.find((s) => s.provider === provider);
    return editingKeys[provider] ?? setting?.apiKey ?? "";
  };

  const isConnected = (provider: AIProvider): boolean => {
    const setting = apiSettings.find((s) => s.provider === provider);
    return setting?.isConnected ?? false;
  };

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
      onSuccess: () => {
        setEditingKeys((prev) => {
          const newState = { ...prev };
          delete newState[provider];
          return newState;
        });
        toast({
          title: "API key saved",
          description: `${providers.find((p) => p.id === provider)?.name} connected successfully`,
        });
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
        toast({
          title: "Disconnected",
          description: `${providers.find((p) => p.id === provider)?.name} has been disconnected`,
        });
      }
    });
  };

  const getTypeColor = (type: ProviderConfig["type"]) => {
    switch (type) {
      case "image":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
      case "video":
        return "bg-purple-500/10 text-purple-600 dark:text-purple-400";
      case "audio":
        return "bg-green-500/10 text-green-600 dark:text-green-400";
      case "multi":
        return "bg-orange-500/10 text-orange-600 dark:text-orange-400";
    }
  };

  return (
    <Dialog open={isSettingsOpen} onOpenChange={setSettingsOpen}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Settings</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="api-keys" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="api-keys" data-testid="settings-tab-api-keys">
              API Keys
            </TabsTrigger>
            <TabsTrigger value="preferences" data-testid="settings-tab-preferences">
              Preferences
            </TabsTrigger>
          </TabsList>

          <TabsContent value="api-keys" className="flex-1 overflow-auto mt-4 space-y-4">
            {providers.map((provider) => (
              <div
                key={provider.id}
                className="p-4 border rounded-md space-y-3"
                data-testid={`provider-section-${provider.id}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center text-muted-foreground">
                      {provider.id === "openai" ? (
                        <SiOpenai className="w-5 h-5" />
                      ) : (
                        <span className="text-sm font-semibold">
                          {provider.name.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{provider.name}</span>
                        <Badge variant="secondary" className={`text-xs ${getTypeColor(provider.type)}`}>
                          {provider.type}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {provider.description}
                      </p>
                    </div>
                  </div>
                  {isConnected(provider.id) && (
                    <Badge variant="secondary" className="gap-1 bg-green-500/10 text-green-600 dark:text-green-400">
                      <Check className="w-3 h-3" />
                      Connected
                    </Badge>
                  )}
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showKeys[provider.id] ? "text" : "password"}
                      placeholder="Enter API key..."
                      value={getApiKey(provider.id)}
                      onChange={(e) => handleKeyChange(provider.id, e.target.value)}
                      className="pr-10 font-mono text-sm"
                      data-testid={`input-api-key-${provider.id}`}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                      onClick={() => toggleShowKey(provider.id)}
                      data-testid={`button-toggle-visibility-${provider.id}`}
                    >
                      {showKeys[provider.id] ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  {isConnected(provider.id) ? (
                    <Button
                      variant="outline"
                      size="default"
                      onClick={() => handleDisconnect(provider.id)}
                      disabled={deleteSettingMutation.isPending}
                      data-testid={`button-disconnect-${provider.id}`}
                    >
                      {deleteSettingMutation.isPending ? (
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
                      onClick={() => handleSaveKey(provider.id)}
                      disabled={!editingKeys[provider.id] || saveSettingMutation.isPending}
                      data-testid={`button-save-${provider.id}`}
                    >
                      {saveSettingMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Save"
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="preferences" className="flex-1 overflow-auto mt-4 space-y-4">
            <div className="p-4 border rounded-md space-y-4">
              <h3 className="font-medium text-sm">Default Providers</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="default-image-provider" className="text-sm">
                    Image Generation
                  </Label>
                  <select
                    id="default-image-provider"
                    className="w-full h-10 px-3 border rounded-md bg-background text-sm"
                    data-testid="select-default-image-provider"
                  >
                    <option value="stability">Stability AI</option>
                    <option value="flux">Flux</option>
                    <option value="openai">OpenAI</option>
                    <option value="replicate">Replicate</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="default-video-provider" className="text-sm">
                    Video Generation
                  </Label>
                  <select
                    id="default-video-provider"
                    className="w-full h-10 px-3 border rounded-md bg-background text-sm"
                    data-testid="select-default-video-provider"
                  >
                    <option value="runway">Runway</option>
                    <option value="kling">Kling</option>
                    <option value="replicate">Replicate</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="p-4 border rounded-md space-y-4">
              <h3 className="font-medium text-sm">Export Settings</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="export-quality" className="text-sm">
                    Export Quality
                  </Label>
                  <select
                    id="export-quality"
                    className="w-full h-10 px-3 border rounded-md bg-background text-sm"
                    data-testid="select-export-quality"
                  >
                    <option value="720p">720p</option>
                    <option value="1080p">1080p</option>
                    <option value="4k">4K</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="export-format" className="text-sm">
                    Export Format
                  </Label>
                  <select
                    id="export-format"
                    className="w-full h-10 px-3 border rounded-md bg-background text-sm"
                    data-testid="select-export-format"
                  >
                    <option value="mp4">MP4</option>
                    <option value="webm">WebM</option>
                    <option value="mov">MOV</option>
                  </select>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
