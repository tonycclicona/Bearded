/**
 * Utilidad para generación dinámica de enlaces y redirección a WhatsApp
 * Números oficiales: +51 930 455 857 y +51 966 830 248
 */

export const WHATSAPP_NUMBERS = [
  {
    id: 'principal',
    label: 'Atención & Reservas (Yape)',
    phone: '51930456857',
    display: '+51 930 456 857',
    role: 'Atención al Cliente, Reservas & Yape (Uriel Caballero Quispitupa)'
  },
  {
    id: 'guias',
    label: 'Guías & Fotografía',
    phone: '51966830248',
    display: '+51 966 830 248',
    role: 'Expediciones y Talleres de Campo'
  }
];

export type WhatsAppTopic = 'PASE' | 'LODGE' | 'EXPERIENCIA' | 'TALLER' | 'TOUR_GIS' | 'GENERAL';

export interface WhatsAppDetails {
  title?: string;
  price?: number | string;
  category?: string;
  date?: string;
  customMessage?: string;
}

export function buildWhatsAppMessage(topic: WhatsAppTopic, details?: WhatsAppDetails): string {
  const title = details?.title ? `*${details.title}*` : '';
  const price = details?.price ? ` (S/. ${details.price} PEN)` : '';

  switch (topic) {
    case 'PASE':
      return `¡Hola Bearded Mountaineer! 🌿 Deseo consultar disponibilidad y reservar el pase: ${title}${price}. ¿Podrían brindarme información de fechas y horarios disponibles?`;
    
    case 'LODGE':
      return `¡Hola! 🏡 Me gustaría reservar la habitación/cabaña: ${title}${price}. ¿Podrían indicarme disponibilidad, tarifas y servicios incluidos para mi estadía?`;
    
    case 'EXPERIENCIA':
      return `¡Hola! ✨ Me interesa información y reserva de la experiencia: ${title}${price}. ¿Cuáles son los horarios y cupos disponibles?`;
    
    case 'TALLER':
      return `¡Hola! 📸 Deseo inscribirme en el taller fotográfico/ornitológico: ${title}${price}. ¿Podrían confirmarme fechas, cupos y requisitos de equipo?`;
    
    case 'TOUR_GIS':
      return `¡Hola! 🦅 Quisiera información sobre la expedición y ruta ornitológica: ${title}. ¿Podrían orientarme sobre fechas, itinerario y biólogos de campo?`;
    
    case 'GENERAL':
    default:
      if (details?.customMessage?.trim()) {
        return `¡Hola Bearded Mountaineer! 🌿 ${details.customMessage.trim()}`;
      }
      return `¡Hola Bearded Mountaineer! 🌿 Deseo realizar una consulta sobre el Santuario de Colibríes, cabañas del Lodge y actividades de ecoturismo en Cusco.`;
  }
}

export function generateWhatsAppUrl(
  topic: WhatsAppTopic = 'GENERAL',
  details?: WhatsAppDetails,
  phoneNumber: string = '51930455857'
): string {
  const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
  const message = buildWhatsAppMessage(topic, details);
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

export function openWhatsApp(
  topic: WhatsAppTopic = 'GENERAL',
  details?: WhatsAppDetails,
  phoneNumber: string = '51930455857'
) {
  if (typeof window === 'undefined') return;
  const url = generateWhatsAppUrl(topic, details, phoneNumber);
  window.open(url, '_blank', 'noopener,noreferrer');
}
