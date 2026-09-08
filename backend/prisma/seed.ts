import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Seed Hummingbird Passes
  const passes = await prisma.hummingbirdPass.findMany();
  if (passes.length === 0) {
    await prisma.hummingbirdPass.createMany({
      data: [
        {
          title: 'Pase Diario - Jardín Sagrado',
          price: 25,
          description: 'Acceso completo al jardín de observación de colibríes por un día.',
          features: [
            'Acceso de 6:00 AM a 5:00 PM',
            'Uso de miradores y bebederos',
            'Guía de campo digital de aves de Cusco',
            'Café e infusión local ilimitados'
          ]
        },
        {
          title: 'Pase de Temporada (Migración)',
          price: 120,
          description: 'Acceso ilimitado durante la temporada alta de migración de aves.',
          features: [
            'Ingreso ilimitado por 3 meses',
            'Invitado gratuito por visita',
            '15% de descuento en el Lodge',
            'Checklist físico de colibríes de cortesía'
          ]
        },
        {
          title: 'Tour Guiado VIP con Biólogo',
          price: 65,
          description: 'Experiencia premium de avistamiento con un especialista local.',
          features: [
            'Duración: 3 horas',
            'Grupos de máximo 4 personas',
            'Uso de telescopio terrestre profesional',
            'Consejos de fotografía de aves'
          ]
        }
      ]
    });
    console.log('Hummingbird passes seeded.');
  }

  // Seed Hummingbird Spots (Escenarios de avistamiento)
  const spots = await prisma.hummingbirdSpot.findMany();
  if (spots.length === 0) {
    await prisma.hummingbirdSpot.createMany({
      data: [
        {
          title: 'Jardín Sagrado',
          description: 'El corazón del santuario: bebederos rodeados de fucsias y salvias donde los colibríes se alimentan a menos de un metro de distancia.',
          benefits: [
            'Observación cercana de 20+ especies',
            'Miradores con techado panorámico',
            'Zona fotográfica con fondos naturales',
            'Accesible para sillas de ruedas'
          ],
          imageUrl: 'https://images.unsplash.com/photo-1613770638968-4d1c3a4b04c3?q=80&w=800',
          sortOrder: 1
        },
        {
          title: 'Bosque de Queñuales',
          description: 'Sendero interpretativo entre árboles nativos y pajonales, refugio del colibrí pico de espada y otras especies endémicas de altura.',
          benefits: [
            'Avistamiento de Ensifera ensifera',
            'Senderos señalizados de 2 km',
            'Paneles de educación ambiental',
            'Guía de interpretación incluida'
          ],
          imageUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=800',
          sortOrder: 2
        },
        {
          title: 'Mirador del Amanecer',
          description: 'Punto elevado con vista al valle al amanecer, ideal para ver el primer vuelo de colibríes entre la niebla baja de San Salvador.',
          benefits: [
            'Salida guiada al alba disponible',
            'Vista panorámica del Valle Sagrado',
            'Momentos de mayor actividad de aves',
            'Soporte de telescopio terrestre'
          ],
          imageUrl: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=800',
          sortOrder: 3
        }
      ]
    });
    console.log('Hummingbird spots seeded.');
  }

  // Seed Routes
  const routes = await prisma.route.findMany();
  if (routes.length === 0) {
    await prisma.route.createMany({
      data: [
        {
          title: 'Ruta Ensifera (Yanahuara)',
          difficulty: 'MODERADO',
          duration: '6 horas',
          price: 80,
          description: 'Ruta de avistamiento especializada en el colibrí pico de espada (Ensifera ensifera) en el Santuario de Yanahuara.',
          startPoint: 'Yanahuara'
        },
        {
          title: 'Humedal Lucre - Huacarpay',
          difficulty: 'FACIL',
          duration: '4 horas',
          price: 50,
          description: 'Observación de aves acuáticas andinas en los humedales de Lucre, un ecosistema Ramsar de gran biodiversidad.',
          startPoint: 'Huacarpay'
        },
        {
          title: 'Expedición Bosque Andino (Pachacutec)',
          difficulty: 'DIFICIL',
          duration: '8 horas',
          price: 110,
          description: 'Búsqueda de especies endémicas de bosque nublado y queñuales en las laderas altas de la cordillera de San Jerónimo.',
          startPoint: 'San Jerónimo'
        }
      ]
    });
    console.log('Routes seeded.');
  }

  // Seed Rooms
  const rooms = await prisma.room.findMany();
  if (rooms.length === 0) {
    await prisma.room.createMany({
      data: [
        {
          name: 'Habitación Rústica Standard',
          pricePerNight: 120,
          capacity: 2,
          amenities: [
            'Desayuno buffet incluido',
            'Agua caliente por energía solar',
            'Vistas al jardín de colibríes',
            'Wi-Fi de alta velocidad'
          ],
          imageUrl: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?q=80&w=800'
        },
        {
          name: 'Habitación Deluxe Ensifera',
          pricePerNight: 175,
          capacity: 2,
          amenities: [
            'Balcón privado con bebedero de colibríes',
            'Cama King Size de algodón orgánico',
            'Calefactor ecológico',
            'Servicio a la habitación de cortesía'
          ],
          imageUrl: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?q=80&w=800'
        },
        {
          name: 'Cabaña Familiar Cordillera',
          pricePerNight: 240,
          capacity: 4,
          amenities: [
            'Cocina completa equipada',
            'Chimenea de leña tradicional',
            'Terraza panorámica hacia las montañas',
            'Guía privado para caminatas cortas'
          ],
          imageUrl: 'https://images.unsplash.com/photo-1542718610-a1d656d1884c?q=80&w=800'
        }
      ]
    });
    console.log('Rooms seeded.');
  }

  // Seed Experiences
  const experiences = await prisma.lodgeExperience.findMany();
  if (experiences.length === 0) {
    await prisma.lodgeExperience.createMany({
      data: [
        {
          title: 'Cooking Class Ancestral',
          price: 45,
          duration: '3 horas',
          description: 'Aprende a preparar platos tradicionales andinos usando ingredientes frescos cosechados directamente de nuestro huerto orgánico guiado por un chef local.',
          included: [
            'Ingredientes orgánicos',
            'Cata de chicha de jora o pisco sour',
            'Recetario digital',
            'Almuerzo completo'
          ]
        },
        {
          title: 'Aventura en Moto Cross',
          price: 95,
          duration: '4 horas',
          description: 'Siente la adrenalina recorriendo los senderos andinos autorizados del Valle Sagrado. Rutas adaptadas a tu nivel técnico.',
          included: [
            'Motocicleta de cross equipada',
            'Casco y equipo de seguridad completo',
            'Guía certificado de aventura',
            'Seguro contra accidentes'
          ]
        },
        {
          title: 'Ciclismo de Montaña San Salvador',
          price: 60,
          duration: '5 horas',
          description: 'Descenso guiado en bicicleta desde los miradores altos de San Salvador hasta el fondo del valle. Paisajes inolvidables de Cusco.',
          included: [
            'Bicicleta de montaña de doble suspensión',
            'Casco, guantes y coderas',
            'Transporte de soporte',
            'Snacks e hidratación'
          ]
        }
      ]
    });
    console.log('Experiences seeded.');
  }

  // Seed Photos
  const photos = await prisma.photoProduct.findMany();
  if (photos.length === 0) {
    await prisma.photoProduct.createMany({
      data: [
        {
          title: 'Ensifera Ensifera en Yanahuara',
          slug: 'ensifera-ensifera-yanahuara',
          price: 45,
          description: 'Fotografía digital de alta resolución del colibrí pico de espada (Ensifera ensifera) alimentándose de flores nativas de fucsia.',
          imageUrl: 'https://images.unsplash.com/photo-1589656966895-2f33e7653819?q=80&w=800',
          species: 'Ensifera ensifera',
          location: 'Santuario de Yanahuara, Cusco',
          camera: 'Sony Alpha 1 + 600mm f/4',
          resolution: '50MP (8640 x 5760)'
        },
        {
          title: 'Colibrí Gigante en el Jardín',
          slug: 'colibri-gigante-jardin',
          price: 35,
          description: 'Impresionante captura del Patagona gigas, el colibrí más grande del mundo, sobrevolando las flores del lodge en San Salvador.',
          imageUrl: 'https://images.unsplash.com/photo-1452570053594-1b985d6ea890?q=80&w=800',
          species: 'Patagona gigas',
          location: 'San Salvador, Cusco',
          camera: 'Canon EOS R5 + 400mm f/2.8',
          resolution: '45MP (8192 x 5464)'
        },
        {
          title: 'Amanecer sobre el Valle Sagrado',
          slug: 'amanecer-valle-sagrado',
          price: 55,
          description: 'Vista panorámica de la cordillera del Urubamba al amanecer desde los miradores del lodge, con niebla baja cubriendo el río.',
          imageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=800',
          location: 'San Salvador, Valle Sagrado',
          camera: 'Fujifilm GFX 100S + 32-64mm',
          resolution: '102MP (11648 x 8736)',
          type: 'PAISAJE'
        },
        {
          title: 'Tangara Andina de Pecho Amarillo',
          slug: 'tangara-andina-pecho-amarillo',
          price: 40,
          description: 'Retrato de detalle con plumaje nítido de la Tangara de montaña posada en una rama musgosa durante la mañana fría.',
          imageUrl: 'https://images.unsplash.com/photo-1444464666168-49d633b86797?q=80&w=800',
          species: 'Anisognathus lacrymosus',
          location: 'Bosque Andino, Pachacutec',
          camera: 'Sony Alpha 9 II + 200-600mm',
          resolution: '24MP (6000 x 4000)'
        }
      ]
    });
    console.log('Photos seeded.');
  }

  // Seed Workshops
  const workshops = await prisma.photoWorkshop.findMany();
  if (workshops.length === 0) {
    await prisma.photoWorkshop.createMany({
      data: [
        {
          title: 'Taller de Fotografía de Aves en Vuelo',
          category: 'AVES',
          price: 150,
          duration: '2 días',
          description: 'Domina las técnicas de enfoque continuo de alta velocidad, iluminación con flash de sincronización rápida y encuadres de colibríes en acción.',
          included: [
            'Clases teóricas en el lodge',
            'Práctica de campo guiada en bebederos',
            'Uso de fondos profesionales y flashes múltiples',
            'Sesión de edición en Lightroom'
          ]
        },
        {
          title: 'Astrofotografía y Vía Láctea en el Valle',
          category: 'PAISAJES',
          price: 195,
          duration: '1 noche',
          description: 'Aprovecha los cielos limpios y la nula contaminación lumínica de San Salvador para fotografiar la Vía Láctea sobre el gazebo y las montañas.',
          included: [
            'Transporte a miradores altos',
            'Catering y bebidas calientes',
            'Guiado por fotógrafo astronómico experto',
            'Taller de apilado digital de imágenes (Sequator/Photoshop)'
          ]
        },
        {
          title: 'Macro y Flora del Bosque Nublado',
          category: 'NATURALEZA',
          price: 130,
          duration: '1 día',
          description: 'Aprende a ajustar el increíble micromundo de orquídeas nativas, helechos, insectos y gotas de rocío en los senderos de Pachacutec.',
          included: [
            'Almuerzo campestre',
            'Préstamo de lentes macro especializados',
            'Guiado personalizado en senderos',
            'Guía PDF de revelado macro'
          ]
        }
      ]
    });
    console.log('Workshops seeded.');
  }

  // Seed Especies de Colibríes
  const especiesCount = await prisma.especieColibri.count();
  if (especiesCount === 0) {
    const colibriEspatula = await prisma.especieColibri.create({
      data: {
        nombreComun: 'Colibrí Cola de Espátula',
        nombreCientifico: 'Loddigesia mirabilis',
        familia: 'Trochilidae',
        estadoIUCN: 'En Peligro (EN)',
        endemicoPeru: true,
        altitudMinMsnm: 2100,
        altitudMaxMsnm: 2900,
        descripcion: 'Una de las aves más extraordinarias del planeta. El macho posee dos largas plumas exteriores en la cola que rematan en grandes discos o espátulas azul violáceo que mueve independientemente en su cortejo.',
        fotoPrincipal: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?q=80&w=1000',
        audioCantoUrl: 'https://www.xeno-canto.org/sounds/uploaded/RNGGHRWSND/XC458921-Loddigesia_mirabilis.mp3'
      }
    });

    const colibriPicoEspada = await prisma.especieColibri.create({
      data: {
        nombreComun: 'Colibrí Picoespada',
        nombreCientifico: 'Ensifera ensifera',
        familia: 'Trochilidae',
        estadoIUCN: 'Preocupación Menor (LC)',
        endemicoPeru: false,
        altitudMinMsnm: 2400,
        altitudMaxMsnm: 3500,
        descripcion: 'La única ave del mundo con un pico más largo que la longitud de su propio cuerpo (excluyendo la cola). Coevolucionó para alimentarse de flores tubulares profundas de Passiflora y Brugmansia.',
        fotoPrincipal: 'https://images.unsplash.com/photo-1520637736862-4d1921f9a2b5?q=80&w=1000',
        audioCantoUrl: 'https://www.xeno-canto.org/sounds/uploaded/TNVYIOVUOI/XC189320-Ensifera_ensifera.mp3'
      }
    });

    const colibriBarbudo = await prisma.especieColibri.create({
      data: {
        nombreComun: 'Colibrí Barbudo / Bearded Mountaineer',
        nombreCientifico: 'Oreonympha nobilis',
        familia: 'Trochilidae',
        estadoIUCN: 'Casi Amenazado (NT)',
        endemicoPeru: true,
        altitudMinMsnm: 2700,
        altitudMaxMsnm: 3900,
        descripcion: 'Espléndido colibrí endémico de los valles interandinos secos del sur de Perú (Cusco y Apurímac). Se caracteriza por su parche gular bifurcado de color verde esmeralda y púrpura brillante.',
        fotoPrincipal: 'https://images.unsplash.com/photo-1552728089-57bdde30beb3?q=80&w=1000',
        audioCantoUrl: 'https://www.xeno-canto.org/sounds/uploaded/OOECVBLAOP/XC512044-Oreonympha_nobilis.mp3'
      }
    });

    const rayitoSol = await prisma.especieColibri.create({
      data: {
        nombreComun: 'Rayito de Sol Reluciente',
        nombreCientifico: 'Aglaeactis cupripennis',
        familia: 'Trochilidae',
        estadoIUCN: 'Preocupación Menor (LC)',
        endemicoPeru: false,
        altitudMinMsnm: 2500,
        altitudMaxMsnm: 4200,
        descripcion: 'Colibrí robusto de la alta montaña andina con un llamativo escudo dorsal iridiscente cobrizo y purpúreo que reluce intensamente con la luz solar en los pajonales y bosques de Polylepis.',
        fotoPrincipal: 'https://images.unsplash.com/photo-1579273166152-d725a4e2b755?q=80&w=1000',
        audioCantoUrl: 'https://www.xeno-canto.org/sounds/uploaded/OOECVBLAOP/XC324110-Aglaeactis_cupripennis.mp3'
      }
    });

    const colibriGigante = await prisma.especieColibri.create({
      data: {
        nombreComun: 'Colibrí Gigante',
        nombreCientifico: 'Patagona gigas',
        familia: 'Trochilidae',
        estadoIUCN: 'Preocupación Menor (LC)',
        endemicoPeru: false,
        altitudMinMsnm: 2000,
        altitudMaxMsnm: 3800,
        descripcion: 'El colibrí de mayor tamaño del planeta (pesa hasta 24 gramos y mide 22 cm). Su aleteo es notablemente pausado (12-15 batidos por segundo) similar al vuelo de una golondrina.',
        fotoPrincipal: 'https://images.unsplash.com/photo-1613770638968-4d1c3a4b04c3?q=80&w=1000',
        audioCantoUrl: 'https://www.xeno-canto.org/sounds/uploaded/RNGGHRWSND/XC610221-Patagona_gigas.mp3'
      }
    });

    console.log('Especies de colibríes seeded.');

    // Seed Puntos GIS
    const puntoAbraPatricia = await prisma.puntoGIS.create({
      data: {
        nombre: 'Reserva Biológica Abra Patricia',
        slug: 'abra-patricia-amazonas',
        categoria: 'OBSERVATORIO_SILVESTRE',
        departamento: 'San Martín / Amazonas',
        latitud: -5.6983333,
        longitud: -77.8186111,
        altitudMsnm: 2200,
        mejorTemporada: 'Mayo a Noviembre',
        acceso: 'Carretera Fernando Belaúnde Terry y senderos de bosque nublado',
        descripcion: 'Famoso santuario ornitológico global en ceja de selva norte. Alberga decenas de especies de colibríes de alta montaña, tángaras y la lechucita bigotona.',
        fotoUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=1000',
        especies: {
          connect: [{ id: colibriEspatula.id }, { id: colibriPicoEspada.id }]
        }
      }
    });

    const puntoHuembo = await prisma.puntoGIS.create({
      data: {
        nombre: 'Centro de Conservación Huembo',
        slug: 'huembo-lodge-amazonas',
        categoria: 'HOTSPOT_COMEDERO',
        departamento: 'Amazonas',
        latitud: -5.9866667,
        longitud: -77.9719444,
        altitudMsnm: 2000,
        mejorTemporada: 'Abril a Diciembre (Floración)',
        acceso: 'Acceso vehicular directo en km 317 y senderos suaves',
        descripcion: 'El principal santuario del Colibrí Cola de Espátula (Loddigesia mirabilis). Cuenta con jardines botánicos de salvias y bebederos para fotografía a distancia focal fija.',
        fotoUrl: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?q=80&w=1000',
        especies: {
          connect: [{ id: colibriEspatula.id }]
        }
      }
    });

    const puntoPomac = await prisma.puntoGIS.create({
      data: {
        nombre: 'Santuario Histórico Bosque de Pómac',
        slug: 'bosque-pomac-lambayeque',
        categoria: 'OBSERVATORIO_SILVESTRE',
        departamento: 'Lambayeque',
        latitud: -6.4819444,
        longitud: -79.7788889,
        altitudMsnm: 100,
        mejorTemporada: 'Todo el año',
        acceso: 'Vehicular 4x4 y senderos llanos de bosque seco',
        descripcion: 'El mayor bosque de algarrobos milenarios del planeta. Punto clave de la Ruta Norte para especies de bosque seco y aves tumbesinas.',
        fotoUrl: 'https://images.unsplash.com/photo-1516214104703-d870798883c5?q=80&w=1000'
      }
    });

    const puntoCarpish = await prisma.puntoGIS.create({
      data: {
        nombre: 'Túnel de Carpish & Bosque de Montaña',
        slug: 'carpish-huanuco',
        categoria: 'OBSERVATORIO_SILVESTRE',
        departamento: 'Huánuco',
        latitud: -9.7166667,
        longitud: -76.0833333,
        altitudMsnm: 2700,
        mejorTemporada: 'Mayo a Octubre',
        acceso: 'Sendero moderado por ceja de selva andina',
        descripcion: 'Mítica zona ornitológica de la vertiente oriental andina central, famosa por su bosque de neblina húmedo y colibríes endémicos.',
        fotoUrl: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=1000',
        especies: {
          connect: [{ id: colibriPicoEspada.id }, { id: rayitoSol.id }]
        }
      }
    });

    const puntoUnchog = await prisma.puntoGIS.create({
      data: {
        nombre: 'Bosque Unchog (El Paraíso de Endémicos)',
        slug: 'bosque-unchog-huanuco',
        categoria: 'ESPECIE_ENDEMICA',
        departamento: 'Huánuco',
        latitud: -9.7166667,
        longitud: -76.1500000,
        altitudMsnm: 3600,
        mejorTemporada: 'Junio a Noviembre',
        acceso: 'Camino de herradura exigente y caminata 4h',
        descripcion: 'Área de conservación comunitaria que protege el hábitat exclusivo de aves endémicas en peligro crítico de extinción y colibríes de bosque de queñual.',
        fotoUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1000',
        especies: {
          connect: [{ id: rayitoSol.id }, { id: colibriGigante.id }]
        }
      }
    });

    const puntoSantaEulalia = await prisma.puntoGIS.create({
      data: {
        nombre: 'Cañón de Santa Eulalia & Autisha',
        slug: 'santa-eulalia-lima',
        categoria: 'OBSERVATORIO_SILVESTRE',
        departamento: 'Lima',
        latitud: -11.8900000,
        longitud: -76.6500000,
        altitudMsnm: 2400,
        mejorTemporada: 'Todo el año',
        acceso: 'Vehicular y sendero de quebrada',
        descripcion: 'Valle interandino al este de Lima que permite observar especies de colibríes de ladera desértica y matorral montano como Thaumastura cora y Patagona gigas.',
        fotoUrl: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?q=80&w=1000',
        especies: {
          connect: [{ id: colibriGigante.id }]
        }
      }
    });

    const puntoSanSalvador = await prisma.puntoGIS.create({
      data: {
        nombre: 'Santuario de Colibríes Bearded Mountaineer',
        slug: 'santuario-san-salvador-cusco',
        categoria: 'HOTSPOT_COMEDERO',
        departamento: 'Cusco',
        latitud: -13.4869444,
        longitud: -71.7877778,
        altitudMsnm: 2950,
        mejorTemporada: 'Todo el año (Óptimo Mayo a Diciembre)',
        acceso: 'Vehicular asfaltado y sendero adaptado',
        descripcion: 'Estación ornitológica y lodge en el Valle Sagrado con jardines florales diseñados para avistamiento cercano del colibrí barbudo y más de 30 especies de aves.',
        fotoUrl: 'https://images.unsplash.com/photo-1552728089-57bdde30beb3?q=80&w=1000',
        especies: {
          connect: [{ id: colibriBarbudo.id }, { id: colibriPicoEspada.id }, { id: rayitoSol.id }, { id: colibriGigante.id }]
        }
      }
    });

    const puntoManu = await prisma.puntoGIS.create({
      data: {
        nombre: 'Bosque Nuboso del Manu & Cock-of-the-rock',
        slug: 'bosque-nuboso-manu-cusco',
        categoria: 'OBSERVATORIO_SILVESTRE',
        departamento: 'Cusco / Madre de Dios',
        latitud: -13.0552778,
        longitud: -71.5458333,
        altitudMsnm: 1400,
        mejorTemporada: 'Mayo a Octubre',
        acceso: 'Carretera a Paucartambo y senderos forestales',
        descripcion: 'El gradiente altitudinal con mayor biodiversidad ornitológica del mundo en la vertiente oriental de los Andes hacia la Amazonía del Manu.',
        fotoUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=1000',
        especies: {
          connect: [{ id: colibriPicoEspada.id }]
        }
      }
    });

    const puntoAbraMalaga = await prisma.puntoGIS.create({
      data: {
        nombre: 'Paso Abra Málaga & Bosques de Polylepis',
        slug: 'abra-malaga-cusco',
        categoria: 'ESPECIE_ENDEMICA',
        departamento: 'Cusco',
        latitud: -13.1438889,
        longitud: -72.3161111,
        altitudMsnm: 4350,
        mejorTemporada: 'Mayo a Octubre',
        acceso: 'Carretera asfaltada Ollantaytambo-Quillabamba y sendero altoandino',
        descripcion: 'Punto icónico para avistamiento de especialistas de queñual y colibríes altoandinos como Oreotrochilus y Aglaeactis.',
        fotoUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1000',
        especies: {
          connect: [{ id: rayitoSol.id }]
        }
      }
    });

    const puntoMachuPicchu = await prisma.puntoGIS.create({
      data: {
        nombre: 'Santuario Histórico de Machu Picchu',
        slug: 'santuario-machu-picchu-cusco',
        categoria: 'OBSERVATORIO_SILVESTRE',
        departamento: 'Cusco',
        latitud: -13.1633333,
        longitud: -72.5455556,
        altitudMsnm: 2430,
        mejorTemporada: 'Abril a Noviembre',
        acceso: 'Tren y senderos ecológicos de Aguas Calientes',
        descripcion: 'Bosque de nubes con una mezcla única de historia milenaria, orquídeas nativas y especies de colibríes de ceja de selva como el Colibrí Inca.',
        fotoUrl: 'https://images.unsplash.com/photo-1526392060635-9d6019884377?q=80&w=1000',
        especies: {
          connect: [{ id: colibriPicoEspada.id }]
        }
      }
    });

    const puntoColca = await prisma.puntoGIS.create({
      data: {
        nombre: 'Cañón del Colca & Cruz del Cóndor',
        slug: 'canon-colca-arequipa',
        categoria: 'LOGISTICA_PUNTO_ENCUENTRO',
        departamento: 'Arequipa',
        latitud: -15.6086111,
        longitud: -71.8958333,
        altitudMsnm: 3600,
        mejorTemporada: 'Abril a Diciembre',
        acceso: 'Carretera turística y miradores acondicionados',
        descripcion: 'Uno de los cañones más profundos de la Tierra. Punto de encuentro logístico del sur para avistamiento de cóndores y colibríes gigantes en cactáceas columnares.',
        fotoUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1000',
        especies: {
          connect: [{ id: colibriGigante.id }]
        }
      }
    });

    console.log('Puntos GIS seeded.');

    // Seed Tours Ornitológicos
    await prisma.tour.create({
      data: {
        nombre: 'Expedición Colibrí Cola de Espátula & Bosque Nuboso',
        slug: 'expedicion-colibri-cola-espatula-norte',
        descripcion: 'Ruta especializada de 5 días por el circuito norte peruano diseñada para ornitólogos y fotógrafos. Recorremos Huembo y Abra Patricia para registrar al endémico Loddigesia mirabilis y más de 45 especies de troquilinos.',
        itinerario: 'Día 1: Tarapoto - Moyobamba (Jardines de colibríes). Día 2: Centro Huembo y fotografía de cortejo. Día 3-4: Reserva Abra Patricia y lechucita bigotona. Día 5: Retorno a Tarapoto.',
        regionRuta: 'Ruta Norte',
        nivelCaminata: 'Fácil / Fotografía',
        equipoOpticoReq: 'Telescopio terrestre 80mm ED, Binoculares 8x42, Teleobjetivo 300-600mm',
        precio_adulto: 1850.00,
        duracion_dias: 5,
        cupos_disponibles: 8,
        servicios_incluidos: JSON.stringify(['Guía ornitólogo bilingüe certificado', 'Transporte privado 4x4', 'Alojamiento en eco-lodges', 'Pases de ingreso a reservas privadas', 'Telescopio Swarovsky de uso compartido', 'Todas las comidas']),
        servicios_excluidos: JSON.stringify(['Vuelos nacionales a Tarapoto', 'Bebidas alcohólicas', 'Propinas']),
        que_llevar: JSON.stringify(['Ropa impermeable y ponchos', 'Botas de trekking', 'Binoculares', 'Baterías y tarjetas de memoria extra', 'Repelente biodegradable']),
        activo: true,
        destacado: true,
        hotspots: {
          connect: [{ id: puntoHuembo.id }, { id: puntoAbraPatricia.id }, { id: puntoPomac.id }]
        }
      }
    });

    await prisma.tour.create({
      data: {
        nombre: 'Travesía Ornitológica del Manu & Santuario Andino',
        slug: 'travesia-ornitologica-manu-sur',
        descripcion: 'Travesía de 6 días que desciende desde los 4,350 msnm en los queñuales de Cusco hasta los 1,400 msnm del bosque nublado del Manu, culminando en el Santuario de San Salvador para avistamiento del Colibrí Barbudo.',
        itinerario: 'Día 1: Cusco - Abra Málaga (Aves de Polylepis). Día 2: Santuario de Colibríes San Salvador. Día 3-5: Descenso al Bosque Nublado del Manu y Cock-of-the-rock Lodge. Día 6: Retorno a Cusco.',
        regionRuta: 'Ruta Sur Manu',
        nivelCaminata: 'Moderado',
        equipoOpticoReq: 'Binoculares 10x42, Micrófono direccional para bioacústica, Trípode de carbono',
        precio_adulto: 2450.00,
        duracion_dias: 6,
        cupos_disponibles: 6,
        servicios_incluidos: JSON.stringify(['Biólogo especialista en aves neotropicales', 'Transporte terrestre exclusivo', '5 noches de lodge de campo', 'Alimentación completa gourmet andina', 'Checklist digital oficial']),
        servicios_excluidos: JSON.stringify(['Vuelos a Cusco', 'Seguro médico de viaje', 'Equipo fotográfico personal']),
        que_llevar: JSON.stringify(['Ropa en capas (frío extremo a templado)', 'Linterna frontal con luz roja', 'Protector solar y sombrero', 'Botella reutilizable']),
        activo: true,
        destacado: true,
        hotspots: {
          connect: [{ id: puntoSanSalvador.id }, { id: puntoManu.id }, { id: puntoAbraMalaga.id }, { id: puntoMachuPicchu.id }]
        }
      }
    });

    await prisma.tour.create({
      data: {
        nombre: 'Ruta de los Endémicos Centrales & Bosque Unchog',
        slug: 'ruta-endemicos-centrales-unchog',
        descripcion: 'Expedición de alta montaña de 4 días enfocada en las especies endémicas más amenazadas del centro del Perú, explorando el cañón de Santa Eulalia, Carpish y la cumbre de Unchog.',
        itinerario: 'Día 1: Lima - Santa Eulalia (Colibrí Oasis y Gigante). Día 2: Huánuco y Túnel de Carpish. Día 3: Campamento en Bosque Unchog. Día 4: Descenso y retorno a Huánuco.',
        regionRuta: 'Ruta Centro',
        nivelCaminata: 'Exigente / Alta Montaña',
        equipoOpticoReq: 'Binoculares 8x32 compactos, Bastones de marcha, Equipo de acampada ligero',
        precio_adulto: 1600.00,
        duracion_dias: 4,
        cupos_disponibles: 6,
        servicios_incluidos: JSON.stringify(['Guía ornitólogo local de Huánuco', 'Mulas de carga y porteadores para campamento', 'Carpas 4 estaciones y alimentación de expedición', 'Botiquín de primeros auxilios con oxígeno']),
        servicios_excluidos: JSON.stringify(['Bolsa de dormir técnica', 'Vuelos o buses interprovinciales']),
        que_llevar: JSON.stringify(['Ropa térmica para temperaturas bajo cero', 'Chaqueta cortaviento Gore-Tex', 'Pastillas para mal de altura']),
        activo: true,
        destacado: false,
        hotspots: {
          connect: [{ id: puntoCarpish.id }, { id: puntoUnchog.id }, { id: puntoSantaEulalia.id }]
        }
      }
    });

    console.log('Tours seeded.');
  }

  // Seed Guías Ornitólogos
  const guiasCount = await prisma.guia.count();
  if (guiasCount === 0) {
    await prisma.guia.createMany({
      data: [
        {
          nombre: 'Dr. Carlos Valdivia Ramos',
          especialidad: 'Ornitólogo / Especialista en Troquilinos Neotropicales',
          experiencia: '16 Años en expediciones de campo',
          idiomas: 'Español, Inglés, Quechua',
          foto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600',
          descripcion: 'Doctor en Biología por la UNSAAC con más de 30 publicaciones científicas sobre la ecología reproductiva y cantos de los colibríes altoandinos del sur de Perú.',
          orden: 1,
          activo: true
        },
        {
          nombre: 'Lic. Elena Mendoza Quispe',
          especialidad: 'Especialista en Aves Andinas & Grabación de Bioacústica',
          experiencia: '11 Años de guiado ornitológico',
          idiomas: 'Español, Inglés, Francés',
          foto: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=600',
          descripcion: 'Consultora de biodiversidad para la conservación de la Reserva de Biósfera del Manu. Apasionada por la identificación auditiva de aves y la fotografía macro.',
          orden: 2,
          activo: true
        },
        {
          nombre: 'Marco Aurelio Paucar',
          especialidad: 'Guía Naturalista de Campo & Fotógrafo de Naturaleza',
          experiencia: '14 Años en Rutas de Aves de Perú',
          idiomas: 'Español, Inglés',
          foto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=600',
          descripcion: 'Guía oficial de turismo especializado en expediciones ornitológicas de la Ruta Norte y Sur. Experto en técnicas de hide y fotografía de alta velocidad de colibríes.',
          orden: 3,
          activo: true
        }
      ]
    });
    console.log('Guías seeded.');
  }

  console.log('Seeding completed.');
}

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL || 'admin@beardedmountaineer.com';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const hash = await bcrypt.hash(password, 10);
  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: 'Admin',
      password: hash,
      role: 'admin'
    }
  });
  console.log(`Admin user ready: ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await seedAdmin().finally(async () => {
      await prisma.$disconnect();
    });
  });