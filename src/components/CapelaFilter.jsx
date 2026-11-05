'use client';

/** Filtro de capela do calendário: um menu, para não criar outra linha de abas. */
import { useRouter } from 'next/navigation';
import { Select } from './Select.jsx';

/** @param {{options: {value: string, label: string, href: string}[], value: string}} props */
export function CapelaFilter({ options, value }) {
  const router = useRouter();

  return (
    <div className="calendar-filter">
      <Select
        compact
        label="Filtrar por capela"
        value={value}
        options={options}
        onChange={(next) => router.push(options.find((option) => option.value === next).href)}
      />
    </div>
  );
}
