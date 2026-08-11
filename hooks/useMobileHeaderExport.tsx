"use client";

import { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo, ReactNode } from "react";

interface ExportHandlers {
  onExportPdf: (() => void) | null;
  onExportExcel: (() => void) | null;
}

interface MobileHeaderExportContextValue {
  state: ExportHandlers;
  register: (onExportPdf: (() => void) | null, onExportExcel: (() => void) | null) => void;
}

const MobileHeaderExportContext = createContext<MobileHeaderExportContextValue | null>(null);

/** Mirrors useMobileHeaderRefresh's pattern, for pages whose mobile header
 *  action is an export dropdown instead of a single refresh icon. */
export function MobileHeaderExportProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ExportHandlers>({ onExportPdf: null, onExportExcel: null });

  const register = useCallback((onExportPdf: (() => void) | null, onExportExcel: (() => void) | null) => {
    setState({ onExportPdf, onExportExcel });
  }, []);

  const value = useMemo(() => ({ state, register }), [state, register]);

  return (
    <MobileHeaderExportContext.Provider value={value}>
      {children}
    </MobileHeaderExportContext.Provider>
  );
}

export function useMobileHeaderExportState(): ExportHandlers {
  const ctx = useContext(MobileHeaderExportContext);
  return ctx?.state ?? { onExportPdf: null, onExportExcel: null };
}

export function useMobileHeaderExport(onExportPdf: () => void, onExportExcel: () => void) {
  const register = useContext(MobileHeaderExportContext)?.register;
  const pdfRef = useRef(onExportPdf);
  const excelRef = useRef(onExportExcel);

  useEffect(() => {
    pdfRef.current = onExportPdf;
    excelRef.current = onExportExcel;
  });

  useEffect(() => {
    if (!register) return;
    register(() => pdfRef.current(), () => excelRef.current());
    return () => register(null, null);
  }, [register]);
}
