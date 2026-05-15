import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Mail, Phone, MapPin, Heart } from "lucide-react";

export default function About() {
  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">À propos</h1>
        <p className="text-muted-foreground mt-1">Informations sur le CDEJ Espoir TG0154</p>
      </div>

      <Card className="border-primary/20 shadow-sm overflow-hidden">
        <div className="h-32 bg-primary/10 flex items-center justify-center">
          <Heart className="w-12 h-12 text-primary" />
        </div>
        <CardHeader className="text-center pt-8">
          <CardTitle className="text-2xl">Centre de Développement de l'Enfant et de la Jeunesse</CardTitle>
          <p className="text-lg text-muted-foreground font-medium mt-2">AVEDZE-AGBELOUVE, Togo</p>
          <p className="text-sm font-medium text-primary mt-1">Assemblées de Dieu</p>
        </CardHeader>
        <CardContent className="space-y-8 pb-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">Adresse</p>
                  <p className="text-sm text-muted-foreground">Avédzé-Agbelouvé<br/>Région Maritime, Togo</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">Contact</p>
                  <p className="text-sm text-muted-foreground">+228 93 06 46 11</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">cdejasad@gmail.com</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Building2 className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">Compte Bancaire</p>
                  <p className="text-sm text-muted-foreground">Ecobank TG054 10007 00030 01009370158 56</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-muted/30 p-6 rounded-lg text-center mt-8">
            <p className="text-lg italic text-foreground/80 font-serif">
              "Instruis l'enfant selon la voie qu'il doit suivre, et quand il sera vieux, il ne s'en détournera pas."
            </p>
            <p className="text-sm text-muted-foreground mt-2 font-medium">— Proverbes 22:6</p>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}
