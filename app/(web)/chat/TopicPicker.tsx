"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ConceptOption {
  id: string;
  unitLabel: string | null;
  contentLoLabel: string | null;
  practiceLabel: string | null;
}

export function TopicPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (conceptId: string) => void;
}) {
  const [concepts, setConcepts] = useState<ConceptOption[]>([]);

  useEffect(() => {
    fetch("/api/concepts")
      .then((res) => res.json())
      .then((data: ConceptOption[]) => {
        setConcepts(data);
        if (!value && data.length > 0) {
          onChange(data[0].id);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const labelFor = (concept: ConceptOption) =>
    (concept.contentLoLabel ?? concept.practiceLabel ?? "") +
    (concept.unitLabel ? ` (${concept.unitLabel})` : "");

  return (
    <Select
      items={concepts.map((concept) => ({
        value: concept.id,
        label: labelFor(concept),
      }))}
      value={value ?? ""}
      onValueChange={(newValue) => {
        if (newValue) onChange(newValue);
      }}
    >
      <SelectTrigger className="w-full sm:w-72">
        <SelectValue placeholder="Choose a topic" />
      </SelectTrigger>
      <SelectContent>
        {concepts.map((concept) => (
          <SelectItem key={concept.id} value={concept.id}>
            {labelFor(concept)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
