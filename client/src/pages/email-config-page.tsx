
import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Mail, Server, Shield, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { insertEmailConfigurationSchema, type InsertEmailConfiguration } from "@shared/schema";

interface ApiRequest {
  (method: string, url: string, data?: any): Promise<Response>;
}

declare global {
  const apiRequest: ApiRequest;
}

interface EmailConfigResponse extends Omit<InsertEmailConfiguration, 'smtpPass'> {
  id: number;
  hasPassword: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function EmailConfigPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<InsertEmailConfiguration>({
    resolver: zodResolver(insertEmailConfigurationSchema),
    defaultValues: {
      smtpHost: "",
      smtpPort: 587,
      smtpSecure: false,
      smtpUser: "",
      smtpPass: "",
      fromEmail: "",
      fromName: "",
      isActive: true,
    },
  });

  // Buscar configuração existente
  const { data: emailConfig, isLoading } = useQuery<EmailConfigResponse | null>({
    queryKey: ["/api/email-config"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/email-config");
      if (res.ok) {
        const data = await res.json();
        if (data) {
          // Preencher formulário com dados existentes
          form.reset({
            smtpHost: data.smtpHost,
            smtpPort: data.smtpPort,
            smtpSecure: data.smtpSecure,
            smtpUser: data.smtpUser,
            smtpPass: "", // Não mostrar senha por segurança
            fromEmail: data.fromEmail,
            fromName: data.fromName || "",
            isActive: data.isActive,
          });
        }
        return data;
      }
      throw new Error("Erro ao carregar configuração");
    },
  });

  // Criar/Atualizar configuração
  const saveConfigMutation = useMutation({
    mutationFn: async (data: InsertEmailConfiguration) => {
      const method = emailConfig ? "PUT" : "POST";
      const url = emailConfig ? `/api/email-config/${emailConfig.id}` : "/api/email-config";
      const res = await apiRequest(method, url, data);
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Erro ao salvar configuração");
      }
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-config"] });
      toast({
        title: "Configuração salva!",
        description: "As configurações de email foram salvas com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Testar configuração
  const testConfigMutation = useMutation({
    mutationFn: async (data: InsertEmailConfiguration) => {
      const res = await apiRequest("POST", "/api/email-config/test", data);
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Erro no teste");
      }
      
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Teste realizado!",
        description: "A configuração foi testada com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Falha no teste",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertEmailConfiguration) => {
    // Se não digitou nova senha e já existe configuração, remover campo senha
    if (!data.smtpPass && emailConfig) {
      const { smtpPass, ...dataWithoutPassword } = data;
      saveConfigMutation.mutate(dataWithoutPassword as InsertEmailConfiguration);
    } else {
      saveConfigMutation.mutate(data);
    }
  };

  const onTest = () => {
    const data = form.getValues();
    if (!data.smtpPass && emailConfig) {
      toast({
        title: "Senha necessária",
        description: "Digite a senha SMTP para testar a configuração.",
        variant: "destructive",
      });
      return;
    }
    testConfigMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button variant="outline" asChild className="flex items-center gap-2">
                <a href="/">
                  <ArrowLeft className="h-4 w-4" />
                  Voltar
                </a>
              </Button>
              <div className="flex items-center gap-3">
                <Mail className="h-8 w-8 text-blue-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Configuração de Email</h1>
                  <p className="text-sm text-gray-600">Configure o servidor SMTP para envio de emails</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Configurações do Servidor */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Server className="h-5 w-5" />
                    Servidor SMTP
                  </CardTitle>
                  <CardDescription>
                    Configure as informações do servidor de email
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="smtpHost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Servidor SMTP *</FormLabel>
                        <FormControl>
                          <Input placeholder="smtp.gmail.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="smtpPort"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Porta *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="587"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 587)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="smtpSecure"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                          <div className="space-y-0.5">
                            <FormLabel>SSL/TLS</FormLabel>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Autenticação */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Autenticação
                  </CardTitle>
                  <CardDescription>
                    Credenciais para autenticação no servidor
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="smtpUser"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Usuário SMTP *</FormLabel>
                        <FormControl>
                          <Input placeholder="seu-email@gmail.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="smtpPass"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Senha SMTP *
                          {emailConfig && (
                            <span className="text-xs text-gray-500 ml-2">
                              (deixe em branco para manter a senha atual)
                            </span>
                          )}
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder={emailConfig ? "••••••••" : "Digite a senha"}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Configurações de Remetente */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Remetente
                </CardTitle>
                <CardDescription>
                  Configure as informações que aparecerão como remetente dos emails
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="fromEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email do Remetente *</FormLabel>
                        <FormControl>
                          <Input placeholder="noreply@empresa.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="fromName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do Remetente</FormLabel>
                        <FormControl>
                          <Input placeholder="Sua Empresa" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Configuração Ativa
                        </FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Esta configuração será usada para envio de emails
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Separator />

            {/* Botões de Ação */}
            <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={onTest}
                disabled={testConfigMutation.isPending}
                className="flex items-center gap-2"
              >
                {testConfigMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    Testando...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4" />
                    Testar Configuração
                  </>
                )}
              </Button>
              
              <Button
                type="submit"
                disabled={saveConfigMutation.isPending}
                className="flex items-center gap-2"
              >
                {saveConfigMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Salvando...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4" />
                    Salvar Configuração
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>

        {/* Informações Adicionais */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-lg">Informações Importantes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
              <p>Para Gmail, use <code className="bg-gray-100 px-2 py-1 rounded">smtp.gmail.com</code> na porta <code className="bg-gray-100 px-2 py-1 rounded">587</code></p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
              <p>Para Gmail, você precisará gerar uma senha de aplicativo específica</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
              <p>Para Outlook/Hotmail, use <code className="bg-gray-100 px-2 py-1 rounded">smtp-mail.outlook.com</code> na porta <code className="bg-gray-100 px-2 py-1 rounded">587</code></p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
              <p><strong>Importante:</strong> Suas credenciais são armazenadas de forma segura e nunca são expostas na interface</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
