import { useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { HeartHandshake, Loader2 } from "lucide-react";

const formSchema = z.object({
  email: z.string().email({ message: "Email invalide" }),
  password: z.string().min(1, { message: "Mot de passe requis" }),
});

export default function Login() {
  const [, setLocation] = useLocation();
  const { login, isAuthenticated, initializing } = useAuth();
  const loginMutation = useLogin();
  const { toast } = useToast();

  // Si l'utilisateur est déjà authentifié (cookie de refresh valide), on le
  // renvoie directement sur le dashboard plutôt que d'afficher le formulaire.
  useEffect(() => {
    if (!initializing && isAuthenticated) {
      setLocation("/dashboard");
    }
  }, [initializing, isAuthenticated, setLocation]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    loginMutation.mutate(
      { data: values },
      {
        onSuccess: (data) => {
          login(data.access_token, data.user);
          setLocation("/dashboard");
        },
        onError: (error) => {
          toast({
            title: "Erreur de connexion",
            description: error.message || "Identifiants invalides.",
            variant: "destructive",
          });
        },
      }
    );
  }

  // Pendant le bootstrap auth, on évite de flasher le formulaire de login.
  if (initializing) {
    return (
      <div
        className="min-h-[100dvh] flex items-center justify-center bg-background"
        role="status"
        aria-live="polite"
      >
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="sr-only">Chargement…</span>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-background">
      {/* Left side: Branding & Vibe */}
      <div className="hidden md:flex flex-1 bg-primary relative items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-black/10 z-0"></div>
        <div className="relative z-10 p-12 text-primary-foreground max-w-lg">
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mb-8 backdrop-blur-sm border border-white/30">
            <HeartHandshake className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold mb-4 font-sans leading-tight">
            CDEJ Espoir <br />
            <span className="text-white/80 font-medium">TG0154</span>
          </h1>
          <p className="text-lg text-white/90 font-serif italic border-l-4 border-white/40 pl-4 py-1">
            "Instruis l'enfant selon la voie qu'il doit suivre; Et quand il sera
            vieux, il ne s'en détournera pas."
          </p>
          <p className="text-sm text-white/60 mt-4 uppercase tracking-widest font-semibold">
            Proverbes 22:6
          </p>
        </div>
      </div>

      {/* Right side: Login form */}
      <div className="flex-1 flex flex-col justify-center px-8 md:px-16 lg:px-24 py-12">
        <div className="w-full max-w-sm mx-auto">
          <div className="mb-8 md:hidden flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-primary flex items-center justify-center">
              <HeartHandshake className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">CDEJ Espoir</h1>
          </div>

          <div className="mb-10">
            <h2 className="text-3xl font-bold tracking-tight text-foreground mb-2">
              Bienvenue
            </h2>
            <p className="text-muted-foreground">
              Connectez-vous pour accéder à votre espace de gestion.
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        autoComplete="email"
                        autoCapitalize="none"
                        spellCheck={false}
                        placeholder="nom@exemple.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mot de passe</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="current-password"
                        placeholder="••••••••"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full h-11 text-base shadow-sm"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Connexion...
                  </>
                ) : (
                  "Se connecter"
                )}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
