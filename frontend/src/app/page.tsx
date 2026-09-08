import Navbar from '@/components/Navbar';
import HeroSection from '@/components/sections/HeroSection';
import TaxonomySection from '@/components/sections/TaxonomySection';
import HummingbirdSection from '@/components/sections/HummingbirdSection';
import MapaPeruGIS from '@/components/gis/MapaPeruGIS';
import LodgeSection from '@/components/sections/LodgeSection';
import GuidesSection from '@/components/sections/GuidesSection';
import GallerySection from '@/components/sections/GallerySection';

// Carga mediante ISR (1 hora)
export const revalidate = 3600;

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <Navbar />
      {/* 1. Inicio */}
      <HeroSection />
      
      {/* 2. Catálogo Taxonómico */}
      <TaxonomySection />

      {/* 3. Avistamiento de Aves & Escenarios */}
      <HummingbirdSection />

      {/* 4. Plataforma GIS de Perú */}
      <MapaPeruGIS />

      {/* 5. Lodge y Experiencias */}
      <LodgeSection />

      {/* 6. Especialistas en el Campo */}
      <GuidesSection />

      {/* 7. Galería & Talleres */}
      <GallerySection />
      
      {/* Footer Final */}
      <footer className="bg-primary-solid text-white py-16 px-6 border-t border-white/10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="space-y-4">
            <h4 className="font-serif text-2xl font-bold text-accent">Bearded Mountaineer</h4>
            <p className="text-xs text-white/70 font-light leading-relaxed max-w-sm">
              Tu portal de entrada a la biodiversidad andina. Conservamos el hábitat del colibrí Ensifera Ensifera en Cusco, Perú, ofreciendo experiencias de ecoturismo y fotografía de primer nivel.
            </p>
          </div>
          
          <div className="space-y-4">
            <h5 className="text-xs uppercase tracking-widest font-bold text-accent">Navegación</h5>
            <ul className="space-y-2 text-sm font-light text-white/80">
              <li><a href="#inicio" className="hover:text-accent transition-colors">Inicio</a></li>
              <li><a href="#taxonomia" className="hover:text-accent transition-colors">Catálogo Taxonómico</a></li>
              <li><a href="#colibries" className="hover:text-accent transition-colors">Avistamiento & Escenarios</a></li>
              <li><a href="#mapa-gis" className="hover:text-accent transition-colors">Plataforma GIS</a></li>
              <li><a href="#lodge" className="hover:text-accent transition-colors">Lodge & Cabañas</a></li>
              <li><a href="#guias" className="hover:text-accent transition-colors">Especialistas en Campo</a></li>
              <li><a href="#galeria" className="hover:text-accent transition-colors">Galería & Talleres</a></li>
            </ul>
          </div>
          
          <div className="space-y-4">
            <h5 className="text-xs uppercase tracking-widest font-bold text-accent">Contacto y Reservas</h5>
            <p className="text-sm font-light text-white/85">
              San Salvador – Cusco, Perú<br />
              Celular: +51 930 456 857 / +51 966 830 248<br />
              Email: info@beardedmountaineerlodge.com
            </p>
            <div className="pt-2 text-[10px] text-white/50">
              © {new Date().getFullYear()} Bearded Mountaineer Lodge. Todos los derechos reservados.
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
