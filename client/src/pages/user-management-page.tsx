import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertAdminUserSchema, type User, type InsertAdminUser } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Users, Plus, Edit, Trash2, Search, UserCheck, UserX, Shield, User as UserIcon, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { z } from "zod";

type UserWithoutPassword = Omit<User, 'password'>;

const createUserFormSchema = insertAdminUserSchema.extend({
  confirmPassword: z.string().min(6, "Confirmação de senha deve ter pelo menos 6 caracteres"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Senhas não coincidem",
  path: ["confirmPassword"],
});

const updateUserFormSchema = insertAdminUserSchema.partial().extend({
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres").optional().or(z.literal("")),
  confirmPassword: z.string().optional(),
}).refine((data) => {
  if (data.password && data.password !== "") {
    return data.password === data.confirmPassword;
  }
  return true;
}, {
  message: "Senhas não coincidem",
  path: ["confirmPassword"],
});

type CreateUserFormData = z.infer<typeof createUserFormSchema>;
type UpdateUserFormData = z.infer<typeof updateUserFormSchema>;

export default function UserManagementPage() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithoutPassword | null>(null);

  // Check if current user is admin
  if (!currentUser || currentUser.role !== "admin") {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Shield className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Acesso Negado</h2>
            <p className="text-muted-foreground text-center">
              Você precisa ter privilégios de administrador para acessar esta página.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch users
  const { data: users = [], isLoading } = useQuery<UserWithoutPassword[]>({
    queryKey: ["/api/admin/users"],
  });

  // Create user form
  const createForm = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserFormSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "user",
      status: "active",
      canAccessMaladireta: true,
      canAccessEmailConfig: true,
    },
  });

  // Update user form
  const updateForm = useForm<UpdateUserFormData>({
    resolver: zodResolver(updateUserFormSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "user",
      status: "active",
      canAccessMaladireta: true,
      canAccessEmailConfig: true,
    },
  });

  // Mutations
  const createUserMutation = useMutation({
    mutationFn: async (userData: CreateUserFormData) => {
      const { confirmPassword, ...data } = userData;
      const res = await apiRequest("POST", "/api/admin/users", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setIsCreateDialogOpen(false);
      createForm.reset();
      toast({
        title: "Usuário criado com sucesso",
        description: "O novo usuário foi adicionado ao sistema.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar usuário",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, userData }: { id: number; userData: UpdateUserFormData }) => {
      const { confirmPassword, ...data } = userData;
      // Remove empty password
      if (data.password === "") {
        delete data.password;
      }
      const res = await apiRequest("PUT", `/api/admin/users/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setIsEditDialogOpen(false);
      setEditingUser(null);
      updateForm.reset();
      toast({
        title: "Usuário atualizado com sucesso",
        description: "As informações do usuário foram atualizadas.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar usuário",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      await apiRequest("DELETE", `/api/admin/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Usuário excluído com sucesso",
        description: "O usuário foi removido do sistema.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir usuário",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const clearAllUsersMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", "/api/admin/users/clear-all");
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Contas limpas com sucesso",
        description: `${data.deletedCount || 0} usuários foram removidos do sistema.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao limpar contas",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Filter users based on search term
  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateUser = (data: CreateUserFormData) => {
    createUserMutation.mutate(data);
  };

  const handleUpdateUser = (data: UpdateUserFormData) => {
    if (editingUser) {
      updateUserMutation.mutate({ id: editingUser.id, userData: data });
    }
  };

  const handleEditUser = (user: UserWithoutPassword) => {
    setEditingUser(user);
    updateForm.reset({
      username: user.username,
      email: user.email,
      role: user.role as "admin" | "user",
      status: user.status as "active" | "inactive",
      password: "",
      confirmPassword: "",
      canAccessMaladireta: user.canAccessMaladireta,
      canAccessEmailConfig: user.canAccessEmailConfig,
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteUser = (userId: number) => {
    deleteUserMutation.mutate(userId);
  };

  const handleClearAllUsers = () => {
    clearAllUsersMutation.mutate();
  };

  const getRoleBadge = (role: string) => {
    return role === "admin" ? (
      <Badge variant="destructive" className="gap-1">
        <Shield className="h-3 w-3" />
        Admin
      </Badge>
    ) : (
      <Badge variant="secondary" className="gap-1">
        <UserIcon className="h-3 w-3" />
        Usuário
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    return status === "active" ? (
      <Badge variant="default" className="gap-1">
        <UserCheck className="h-3 w-3" />
        Ativo
      </Badge>
    ) : (
      <Badge variant="outline" className="gap-1">
        <UserX className="h-3 w-3" />
        Inativo
      </Badge>
    );
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-4 mb-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Voltar aos Clientes
              </Button>
            </Link>
          </div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-8 w-8" />
            Gerenciamento de Usuários
          </h1>
          <p className="text-muted-foreground">
            Gerencie usuários e suas permissões no sistema
          </p>
        </div>
        <div className="flex gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" data-testid="button-clear-all-users">
                <Trash2 className="h-4 w-4 mr-2" />
                Limpar Todas as Contas
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar limpeza de contas</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja remover TODAS as contas de usuário do sistema?
                  Apenas sua conta de administrador será mantida. Esta ação não pode ser desfeita
                  e todos os dados dos usuários (clientes, campanhas, configurações) serão 
                  permanentemente removidos.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleClearAllUsers}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  data-testid="button-confirm-clear-all"
                >
                  Limpar Todas as Contas
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-user">
                <Plus className="h-4 w-4 mr-2" />
                Novo Usuário
              </Button>
            </DialogTrigger>
        </div>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Criar Novo Usuário</DialogTitle>
              <DialogDescription>
                Adicione um novo usuário ao sistema com as informações abaixo.
              </DialogDescription>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(handleCreateUser)} className="space-y-4">
                <FormField
                  control={createForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome de Usuário</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-create-username" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} data-testid="input-create-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Senha</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} data-testid="input-create-password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirmar Senha</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} data-testid="input-create-confirm-password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Papel</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-create-role">
                            <SelectValue placeholder="Selecione o papel" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="user">Usuário</SelectItem>
                          <SelectItem value="admin">Administrador</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-create-status">
                            <SelectValue placeholder="Selecione o status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Ativo</SelectItem>
                          <SelectItem value="inactive">Inativo</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Permissions */}
                <div className="space-y-3">
                  <FormLabel className="text-base">Permissões</FormLabel>
                  <FormField
                    control={createForm.control}
                    name="canAccessMaladireta"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-create-maladireta"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            Acesso à Mala Direta
                          </FormLabel>
                          <p className="text-sm text-muted-foreground">
                            Permite acesso às funcionalidades de mala direta
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="canAccessEmailConfig"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-create-email-config"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            Acesso à Configuração de Email
                          </FormLabel>
                          <p className="text-sm text-muted-foreground">
                            Permite acesso às configurações de email
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
                
                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={createUserMutation.isPending}
                    data-testid="button-submit-create"
                  >
                    {createUserMutation.isPending ? "Criando..." : "Criar Usuário"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usuários do Sistema</CardTitle>
          <CardDescription>
            Lista de todos os usuários cadastrados no sistema
          </CardDescription>
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            <Input
              placeholder="Pesquisar usuários..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
              data-testid="input-search-users"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Carregando usuários...</div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="text-muted-foreground">
                        {searchTerm ? "Nenhum usuário encontrado com os critérios de busca." : "Nenhum usuário encontrado."}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                      <TableCell className="font-medium">{user.username}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>{getStatusBadge(user.status)}</TableCell>
                      <TableCell>
                        {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditUser(user)}
                            data-testid={`button-edit-${user.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {user.id !== currentUser.id && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  data-testid={`button-delete-${user.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja excluir o usuário {user.username}? 
                                    Esta ação não pode ser desfeita e todos os dados associados 
                                    (clientes, campanhas) serão permanentemente removidos.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteUser(user.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    data-testid={`button-confirm-delete-${user.id}`}
                                  >
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>
              Atualize as informações do usuário abaixo.
            </DialogDescription>
          </DialogHeader>
          <Form {...updateForm}>
            <form onSubmit={updateForm.handleSubmit(handleUpdateUser)} className="space-y-4">
              <FormField
                control={updateForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome de Usuário</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-username" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={updateForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} data-testid="input-edit-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={updateForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nova Senha (deixe em branco para manter a atual)</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} data-testid="input-edit-password" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={updateForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar Nova Senha</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} data-testid="input-edit-confirm-password" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={updateForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Papel</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-role">
                          <SelectValue placeholder="Selecione o papel" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="user">Usuário</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={updateForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-status">
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Ativo</SelectItem>
                        <SelectItem value="inactive">Inativo</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Permissions */}
              <div className="space-y-3">
                <FormLabel className="text-base">Permissões</FormLabel>
                <FormField
                  control={updateForm.control}
                  name="canAccessMaladireta"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-edit-maladireta"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Acesso à Mala Direta
                        </FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Permite acesso às funcionalidades de mala direta
                        </p>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={updateForm.control}
                  name="canAccessEmailConfig"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-edit-email-config"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Acesso à Configuração de Email
                        </FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Permite acesso às configurações de email
                        </p>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
              
              <DialogFooter>
                <Button
                  type="submit"
                  disabled={updateUserMutation.isPending}
                  data-testid="button-submit-edit"
                >
                  {updateUserMutation.isPending ? "Atualizando..." : "Atualizar Usuário"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}