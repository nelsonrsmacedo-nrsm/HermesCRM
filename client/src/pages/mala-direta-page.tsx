import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { 
  Mail, 
  MessageCircle, 
  Users, 
  Plus, 
  Send, 
  Paperclip, 
  Trash2, 
  Eye,
  CheckSquare,
  Square,
  ArrowLeft
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  insertCampaignSchema, 
  type InsertCampaign, 
  type Campaign, 
  type Client 
} from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

export default function MalaDiretaPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("campanhas");
  const [selectedClients, setSelectedClients] = useState<number[]>([]);
  const [showClientSelection, setShowClientSelection] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);

  // Buscar campanhas
  const { data: campaigns = [], isLoading: isLoadingCampaigns } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"],
    queryFn: async () => {
      const res = await fetch("/api/campaigns", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Erro ao carregar campanhas");
      return res.json();
    },
  });

  // Buscar clientes
  const { data: clients = [], isLoading: isLoadingClients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    queryFn: async () => {
      const res = await fetch("/api/clients", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Erro ao carregar clientes");
      return res.json();
    },
  });

  // Criar campanha
  const createCampaignMutation = useMutation({
    mutationFn: async (campaign: InsertCampaign) => {
      const res = await apiRequest("POST", "/api/campaigns", campaign);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({
        title: "Campanha criada!",
        description: "Campanha foi criada com sucesso.",
      });
      form.reset();
      setActiveTab("campanhas");
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar campanha",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Enviar campanha
  const sendCampaignMutation = useMutation({
    mutationFn: async ({ campaignId, clientIds }: { campaignId: number; clientIds: number[] }) => {
      const res = await apiRequest("POST", `/api/campaigns/${campaignId}/send`, { clientIds });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({
        title: "Campanha enviada!",
        description: "Mensagens estão sendo enviadas para os clientes selecionados.",
      });
      setSelectedClients([]);
      setShowClientSelection(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao enviar campanha",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const form = useForm<InsertCampaign>({
    resolver: zodResolver(insertCampaignSchema),
    defaultValues: {
      name: "",
      type: "email",
      subject: "",
      message: "",
    },
  });

  const onSubmit = (data: InsertCampaign) => {
    if (editingCampaign) {
      // Atualizar campanha (implementar depois)
    } else {
      createCampaignMutation.mutate(data);
    }
  };

  const handleSelectAllClients = () => {
    if (selectedClients.length === clients.length) {
      setSelectedClients([]);
    } else {
      setSelectedClients(clients.map(client => client.id));
    }
  };

  const handleSelectClient = (clientId: number) => {
    setSelectedClients(prev => 
      prev.includes(clientId) 
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  const handleSendCampaign = (campaignId: number) => {
    setShowClientSelection(true);
    // Você pode armazenar o campaignId em um estado se necessário
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(word => word.charAt(0).toUpperCase()).join('').slice(0, 2);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("pt-BR");
  };

  if (showClientSelection) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <Button
              variant="outline"
              onClick={() => setShowClientSelection(false)}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Selecionar Destinatários
            </h1>
            <p className="text-gray-600">
              Escolha os clientes que receberão a campanha de mala direta
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Clientes Disponíveis ({clients.length})
                </div>
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAllClients}
                  >
                    {selectedClients.length === clients.length ? (
                      <>
                        <CheckSquare className="h-4 w-4 mr-2" />
                        Desmarcar Todos
                      </>
                    ) : (
                      <>
                        <Square className="h-4 w-4 mr-2" />
                        Selecionar Todos
                      </>
                    )}
                  </Button>
                  <Badge variant="secondary">
                    {selectedClients.length} selecionados
                  </Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedClients.length === clients.length && clients.length > 0}
                          onCheckedChange={handleSelectAllClients}
                        />
                      </TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead>Localização</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clients.map((client) => (
                      <TableRow key={client.id} className="hover:bg-gray-50">
                        <TableCell>
                          <Checkbox
                            checked={selectedClients.includes(client.id)}
                            onCheckedChange={() => handleSelectClient(client.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mr-4">
                              <span className="text-primary font-medium text-sm">
                                {getInitials(client.name)}
                              </span>
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{client.name}</div>
                              <div className="text-sm text-gray-500">
                                {client.clientType === "PF" ? "Pessoa Física" : "Pessoa Jurídica"}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-gray-900">{client.email}</div>
                            {client.mobilePhone && (
                              <div className="text-sm text-gray-500">
                                📱 {client.mobilePhone}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {client.city && client.state ? (
                              <div className="text-gray-900">{client.city}, {client.state}</div>
                            ) : (
                              <div className="text-gray-500">-</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={client.status === "ativo" ? "default" : "secondary"}>
                            {client.status === "ativo" ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-end mt-6 pt-6 border-t">
                <Button
                  onClick={() => {
                    if (selectedClients.length > 0) {
                      // Implementar envio
                      toast({
                        title: "Funcionalidade em desenvolvimento",
                        description: "O envio de campanhas será implementado em breve.",
                      });
                    }
                  }}
                  disabled={selectedClients.length === 0}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Enviar para {selectedClients.length} cliente{selectedClients.length !== 1 ? 's' : ''}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Sistema de Mala Direta
              </h1>
              <p className="text-gray-600">
                Envie mensagens personalizadas por email ou WhatsApp para seus clientes
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                asChild
                className="flex items-center gap-2"
              >
                <a href="/">
                  <ArrowLeft className="h-4 w-4" />
                  Voltar ao Cadastro
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="campanhas" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Campanhas
            </TabsTrigger>
            <TabsTrigger value="nova" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nova Campanha
            </TabsTrigger>
          </TabsList>

          <TabsContent value="campanhas" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Minhas Campanhas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead>Campanha</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Criada em</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {campaigns.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                            Nenhuma campanha criada ainda.
                          </TableCell>
                        </TableRow>
                      ) : (
                        campaigns.map((campaign) => (
                          <TableRow key={campaign.id} className="hover:bg-gray-50">
                            <TableCell>
                              <div>
                                <div className="font-medium text-gray-900">{campaign.name}</div>
                                <div className="text-sm text-gray-500 truncate max-w-xs">
                                  {campaign.message.substring(0, 60)}...
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="flex items-center gap-1 w-fit">
                                {campaign.type === "email" ? (
                                  <>
                                    <Mail className="h-3 w-3" />
                                    Email
                                  </>
                                ) : (
                                  <>
                                    <MessageCircle className="h-3 w-3" />
                                    WhatsApp
                                  </>
                                )}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-gray-500 text-sm">
                              {formatDate(campaign.createdAt.toString())}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                Pronta
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleSendCampaign(campaign.id)}
                                >
                                  <Send className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm">
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm">
                                  <Trash2 className="h-4 w-4 text-red-600" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="nova" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Criar Nova Campanha
                </CardTitle>
                <p className="text-sm text-gray-600 mt-2">
                  Configure sua mensagem e escolha o canal de envio
                </p>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome da Campanha *</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: Promoção Black Friday 2024" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Canal de Envio *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione o canal" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="email">
                                  <div className="flex items-center gap-2">
                                    <Mail className="h-4 w-4" />
                                    E-mail
                                  </div>
                                </SelectItem>
                                <SelectItem value="whatsapp">
                                  <div className="flex items-center gap-2">
                                    <MessageCircle className="h-4 w-4" />
                                    WhatsApp
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {form.watch("type") === "email" && (
                      <FormField
                        control={form.control}
                        name="subject"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Assunto do E-mail *</FormLabel>
                            <FormControl>
                              <Input placeholder="Digite o assunto do e-mail" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <FormField
                      control={form.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Mensagem *
                            {form.watch("type") === "whatsapp" && (
                              <span className="text-sm text-gray-500 ml-2">
                                (Suporte a emojis e quebras de linha)
                              </span>
                            )}
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              rows={8}
                              placeholder={
                                form.watch("type") === "email" 
                                  ? "Digite o conteúdo do e-mail aqui..."
                                  : "Olá {{nome}}, tudo bem? 😊\n\nTenho uma oferta especial para você..."
                              }
                              className="resize-none"
                              {...field}
                            />
                          </FormControl>
                          <div className="text-sm text-gray-500">
                            <p>Variáveis disponíveis:</p>
                            <p>• <code>{"{{nome}}"}</code> - Nome do cliente</p>
                            <p>• <code>{"{{email}}"}</code> - E-mail do cliente</p>
                            <p>• <code>{"{{telefone}}"}</code> - Telefone do cliente</p>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                      <div className="text-center">
                        <Paperclip className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500 mb-2">Anexar Arquivos</p>
                        <p className="text-sm text-gray-400">
                          Arraste arquivos aqui ou clique para selecionar
                        </p>
                        <Button type="button" variant="outline" className="mt-4">
                          Selecionar Arquivos
                        </Button>
                        <p className="text-xs text-gray-400 mt-2">
                          Máximo 10MB por arquivo • PDF, DOC, DOCX, JPG, PNG
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-6 border-t border-gray-200">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => form.reset()}
                      >
                        Limpar Formulário
                      </Button>
                      <Button
                        type="submit"
                        disabled={createCampaignMutation.isPending}
                      >
                        {createCampaignMutation.isPending ? "Criando..." : "Criar Campanha"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}