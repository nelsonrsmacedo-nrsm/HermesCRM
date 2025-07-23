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
import { Users, Plus, Search, LogOut, Edit, Trash2, User, Building, Phone, MapPin, Contact, Briefcase, MessageSquare } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertClientSchema, type InsertClient, type Client } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("clients");

  const { data: clients = [], isLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients", searchQuery],
    queryFn: async ({ queryKey }) => {
      const [, search] = queryKey;
      const params = search ? `?search=${encodeURIComponent(search as string)}` : "";
      const res = await fetch(`/api/clients${params}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Erro ao carregar clientes");
      return res.json();
    },
  });

  const createClientMutation = useMutation({
    mutationFn: async (client: InsertClient) => {
      const res = await apiRequest("POST", "/api/clients", client);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({
        title: "Cliente cadastrado!",
        description: "Cliente foi adicionado com sucesso.",
      });
      form.reset();
      setActiveTab("clients");
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao cadastrar cliente",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteClientMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/clients/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({
        title: "Cliente removido",
        description: "Cliente foi removido com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao remover cliente",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const form = useForm<InsertClient>({
    resolver: zodResolver(insertClientSchema),
    defaultValues: {
      // Dados Básicos
      name: "",
      clientType: "PF",
      cpfCnpj: "",
      rgIe: "",
      birthDate: "",
      gender: undefined,
      
      // Contato
      email: "",
      landlinePhone: "",
      mobilePhone: "",
      website: "",
      
      // Endereço
      zipCode: "",
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
      country: "Brasil",
      
      // Representante/Contato Principal
      contactName: "",
      contactPosition: "",
      contactPhone: "",
      contactEmail: "",
      
      // Dados Comerciais
      businessArea: "",
      classification: "potencial",
      clientOrigin: "",
      status: "ativo",
      
      // Observações
      notes: "",
      preferences: "",
      serviceHistory: "",
    },
  });

  const onSubmit = (data: InsertClient) => {
    createClientMutation.mutate(data);
  };

  const handleDeleteClient = (id: number) => {
    if (window.confirm("Tem certeza que deseja remover este cliente?")) {
      deleteClientMutation.mutate(id);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation Header */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center mr-3">
                  <Users className="h-4 w-4 text-primary-foreground" />
                </div>
                <h1 className="text-xl font-semibold text-gray-900">Sistema de Clientes</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-sm text-gray-700">
                <User className="h-4 w-4 text-gray-400 mr-2" />
                <span>{user?.username}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 lg:w-auto">
            <TabsTrigger value="clients" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Lista de Clientes
            </TabsTrigger>
            <TabsTrigger value="add" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Novo Cliente
            </TabsTrigger>
          </TabsList>

          <TabsContent value="clients" className="mt-6">
            {/* Search and Stats */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                <div className="flex-1 max-w-lg">
                  <Label htmlFor="search" className="sr-only">Buscar clientes</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="search"
                      type="text"
                      placeholder="Buscar por nome ou e-mail..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Badge variant="secondary" className="text-sm">
                  {clients.length} clientes encontrados
                </Badge>
              </div>
            </div>

            {/* Clients Table */}
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead>Cliente</TableHead>
                        <TableHead>Contato</TableHead>
                        <TableHead>Localização</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                            Carregando clientes...
                          </TableCell>
                        </TableRow>
                      ) : clients.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                            {searchQuery ? "Nenhum cliente encontrado." : "Nenhum cliente cadastrado."}
                          </TableCell>
                        </TableRow>
                      ) : (
                        clients.map((client) => (
                          <TableRow key={client.id} className="hover:bg-gray-50">
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
                                    {client.cpfCnpj && ` • ${client.cpfCnpj}`}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="text-gray-900">{client.email}</div>
                                <div className="text-sm text-gray-500">
                                  {client.mobilePhone && (
                                    <div>📱 {client.mobilePhone}</div>
                                  )}
                                  {client.landlinePhone && (
                                    <div>📞 {client.landlinePhone}</div>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {client.city && client.state ? (
                                  <div className="text-gray-900">{client.city}, {client.state}</div>
                                ) : (
                                  <div className="text-gray-500">-</div>
                                )}
                                {client.neighborhood && (
                                  <div className="text-gray-500">{client.neighborhood}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <Badge
                                  variant={client.status === "ativo" ? "default" : "secondary"}
                                  className="text-xs"
                                >
                                  {client.status === "ativo" ? "Ativo" : "Inativo"}
                                </Badge>
                                {client.classification && (
                                  <div className="text-xs text-gray-500 capitalize">
                                    {client.classification}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-gray-500 text-sm">
                              {formatDate(client.createdAt.toString())}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button variant="ghost" size="sm">
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteClient(client.id)}
                                  disabled={deleteClientMutation.isPending}
                                >
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

          <TabsContent value="add" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Cadastrar Novo Cliente
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Preencha os dados do cliente. Campos marcados com * são obrigatórios.
                </p>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    
                    {/* Dados Básicos */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                        <User className="h-5 w-5" />
                        Dados Básicos
                      </div>
                      <Separator />
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem className="md:col-span-2">
                              <FormLabel>Nome Completo / Razão Social *</FormLabel>
                              <FormControl>
                                <Input placeholder="Digite o nome completo ou razão social" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="clientType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tipo de Cliente *</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione o tipo" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="PF">Pessoa Física</SelectItem>
                                  <SelectItem value="PJ">Pessoa Jurídica</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="cpfCnpj"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>CPF / CNPJ</FormLabel>
                              <FormControl>
                                <Input placeholder="000.000.000-00 ou 00.000.000/0001-00" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="rgIe"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>RG / Inscrição Estadual</FormLabel>
                              <FormControl>
                                <Input placeholder="RG ou Inscrição Estadual" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="birthDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Data de Nascimento / Fundação</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="gender"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Sexo / Gênero</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="M">Masculino</SelectItem>
                                  <SelectItem value="F">Feminino</SelectItem>
                                  <SelectItem value="Outro">Outro</SelectItem>
                                  <SelectItem value="Prefiro não informar">Prefiro não informar</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {/* Informações de Contato */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                        <Phone className="h-5 w-5" />
                        Informações de Contato
                      </div>
                      <Separator />
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>E-mail *</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="cliente@email.com" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="landlinePhone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Telefone Fixo</FormLabel>
                              <FormControl>
                                <Input type="tel" placeholder="(11) 3333-3333" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="mobilePhone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Celular / WhatsApp</FormLabel>
                              <FormControl>
                                <Input type="tel" placeholder="(11) 99999-9999" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="website"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Site / Redes Sociais</FormLabel>
                              <FormControl>
                                <Input type="url" placeholder="https://website.com" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {/* Endereço */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                        <MapPin className="h-5 w-5" />
                        Endereço
                      </div>
                      <Separator />
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <FormField
                          control={form.control}
                          name="zipCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>CEP</FormLabel>
                              <FormControl>
                                <Input placeholder="00000-000" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="street"
                          render={({ field }) => (
                            <FormItem className="md:col-span-2">
                              <FormLabel>Logradouro</FormLabel>
                              <FormControl>
                                <Input placeholder="Rua, Avenida, etc." {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="number"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Número</FormLabel>
                              <FormControl>
                                <Input placeholder="123" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="complement"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Complemento</FormLabel>
                              <FormControl>
                                <Input placeholder="Apto, Sala, etc." {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="neighborhood"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Bairro</FormLabel>
                              <FormControl>
                                <Input placeholder="Centro" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="city"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Cidade</FormLabel>
                              <FormControl>
                                <Input placeholder="São Paulo" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="state"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Estado</FormLabel>
                              <FormControl>
                                <Input placeholder="SP" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="country"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>País</FormLabel>
                              <FormControl>
                                <Input placeholder="Brasil" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {/* Representante/Contato Principal */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                        <Contact className="h-5 w-5" />
                        Representante / Contato Principal
                      </div>
                      <Separator />
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="contactName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nome do Contato</FormLabel>
                              <FormControl>
                                <Input placeholder="Nome do responsável" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="contactPosition"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Cargo</FormLabel>
                              <FormControl>
                                <Input placeholder="Gerente, Diretor, etc." {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="contactPhone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Telefone do Contato</FormLabel>
                              <FormControl>
                                <Input type="tel" placeholder="(11) 99999-9999" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="contactEmail"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>E-mail do Contato</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="contato@empresa.com" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {/* Dados Comerciais */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                        <Briefcase className="h-5 w-5" />
                        Dados Comerciais
                      </div>
                      <Separator />
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="businessArea"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Ramo de Atividade</FormLabel>
                              <FormControl>
                                <Input placeholder="Tecnologia, Varejo, etc." {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="classification"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Classificação</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione a classificação" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="potencial">Potencial</SelectItem>
                                  <SelectItem value="ativo">Ativo</SelectItem>
                                  <SelectItem value="inativo">Inativo</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="clientOrigin"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Origem do Cliente</FormLabel>
                              <FormControl>
                                <Input placeholder="Indicação, site, redes sociais, etc." {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="status"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Status</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione o status" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="ativo">Ativo</SelectItem>
                                  <SelectItem value="inativo">Inativo</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {/* Observações */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                        <MessageSquare className="h-5 w-5" />
                        Observações
                      </div>
                      <Separator />
                      
                      <div className="grid grid-cols-1 gap-4">
                        <FormField
                          control={form.control}
                          name="notes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Anotações Adicionais</FormLabel>
                              <FormControl>
                                <Textarea
                                  rows={3}
                                  placeholder="Informações gerais sobre o cliente..."
                                  className="resize-none"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="preferences"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Preferências do Cliente</FormLabel>
                              <FormControl>
                                <Textarea
                                  rows={2}
                                  placeholder="Horários preferenciais, formas de contato, etc."
                                  className="resize-none"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="serviceHistory"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Histórico de Atendimento</FormLabel>
                              <FormControl>
                                <Textarea
                                  rows={3}
                                  placeholder="Histórico de interações e atendimentos..."
                                  className="resize-none"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
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
                        disabled={createClientMutation.isPending}
                      >
                        {createClientMutation.isPending ? "Salvando..." : "Salvar Cliente"}
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
