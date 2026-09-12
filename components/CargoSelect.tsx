"use client";

import type { EquipmentOption } from "@/lib/types";
import { MultiSelectChip } from "./MultiSelectChip";

export const FALLBACK_CARGO_TYPES: EquipmentOption[] = [
  { id: "crgo_genfreight", label: "General Freight" },
  { id: "crgo_household", label: "Household Goods" },
  { id: "crgo_metalsheet", label: "Metal / Sheet" },
  { id: "crgo_motoveh", label: "Motor Vehicles" },
  { id: "crgo_drivetow", label: "Driveaway / Towaway" },
  { id: "crgo_logpole", label: "Logs / Poles" },
  { id: "crgo_bldgmat", label: "Building Materials" },
  { id: "crgo_machlrg", label: "Machinery / Large Objects" },
  { id: "crgo_produce", label: "Produce" },
  { id: "crgo_liqgas", label: "Liquids / Gases" },
  { id: "crgo_intermodal", label: "Intermodal" },
  { id: "crgo_passengers", label: "Passengers" },
  { id: "crgo_oilfield", label: "Oilfield" },
  { id: "crgo_livestock", label: "Livestock" },
  { id: "crgo_grainfeed", label: "Grain / Feed" },
  { id: "crgo_coalcoke", label: "Coal / Coke" },
  { id: "crgo_meat", label: "Meat" },
  { id: "crgo_garbage", label: "Garbage / Refuse" },
  { id: "crgo_chem", label: "Chemicals" },
  { id: "crgo_drybulk", label: "Dry Bulk" },
  { id: "crgo_coldfood", label: "Refrigerated Food" },
  { id: "crgo_beverages", label: "Beverages" },
  { id: "crgo_paperprod", label: "Paper Products" },
  { id: "crgo_construct", label: "Construction" },
];

type Props = {
  options: EquipmentOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  locked?: boolean;
  lockHint?: string;
};

export function CargoSelect({ options, selected, onChange, locked, lockHint }: Props) {
  return (
    <MultiSelectChip
      label="Cargo"
      emptyLabel="All cargo categories"
      options={options.length ? options : FALLBACK_CARGO_TYPES}
      selected={selected}
      onChange={onChange}
      locked={locked}
      lockHint={lockHint}
    />
  );
}
