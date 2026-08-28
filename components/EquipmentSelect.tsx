"use client";

import type { EquipmentOption } from "@/lib/types";
import { MultiSelectChip } from "./MultiSelectChip";

type Props = {
  options: EquipmentOption[];
  selected: string[];
  onChange: (next: string[]) => void;
};

export function EquipmentSelect({ options, selected, onChange }: Props) {
  return (
    <MultiSelectChip
      label="Equipment"
      emptyLabel="All equipment types"
      options={options}
      selected={selected}
      onChange={onChange}
    />
  );
}
