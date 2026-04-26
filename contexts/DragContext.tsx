"use client";

import { createContext, useContext } from "react";

export type DragType = "new" | "move-bar" | "resize-start" | "resize-end" | null;

export const DragContext = createContext<DragType>(null);

export function useDragType(): DragType {
  return useContext(DragContext);
}
