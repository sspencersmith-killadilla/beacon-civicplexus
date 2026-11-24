import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
const Ctx = createContext<{ on: boolean; toggle: () => void }>({ on: false, toggle: () => {} });
export function FieldModeProvider({ children }: { children: ReactNode }) {
  const [on, setOn] = useState(false);
  useEffect(() => { setOn(localStorage.getItem("beacon-field-mode") === "1"); }, []);
  useEffect(() => { document.documentElement.classList.toggle("field-mode", on); }, [on]);
  const toggle = () => setOn((v) => { localStorage.setItem("beacon-field-mode", v ? "0" : "1"); return !v; });
  return <Ctx.Provider value={{ on, toggle }}>{children}</Ctx.Provider>;
}
export const useFieldMode = () => useContext(Ctx);
