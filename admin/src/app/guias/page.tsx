'use client';

import ResourceTable, { Column } from '@/components/ResourceTable';

export default function GuiasPage() {
  const columns: Column[] = [
    { header: 'Guía Especialista', accessor: 'nombre', className: 'font-semibold text-gray-900' },
    { header: 'Especialidad', accessor: 'especialidad' },
    { header: 'Idiomas', accessor: (item) => Array.isArray(item.idiomas) ? item.idiomas.join(', ') : 'Español, Inglés' },
    { header: 'Experiencia', accessor: (item) => `${item.aniosExperiencia || 5} años` }
  ];

  return (
    <ResourceTable
      title="Guías de Campo & Especialistas"
      description="Biólogos, ornitólogos locales y fotógrafos de naturaleza de expedición."
      endpoint="/guias"
      columns={columns}
      onNew={() => alert('Nuevo guía')}
      onEdit={(item) => alert(`Editando: ${item.nombre}`)}
    />
  );
}
