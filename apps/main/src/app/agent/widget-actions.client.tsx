"use client";

import { createContext, useContext, type ReactNode } from "react";

type WidgetActions = {
  sendText: (text: string, opts?: { pushUserBubble?: boolean }) => Promise<void>;
  sending: boolean;
};

const WidgetActionsContext = createContext<WidgetActions | null>(null);

export function WidgetActionsProvider({
  actions,
  children,
}: {
  actions: WidgetActions;
  children: ReactNode;
}) {
  return (
    <WidgetActionsContext.Provider value={actions}>
      {children}
    </WidgetActionsContext.Provider>
  );
}

export function useWidgetActions(): WidgetActions {
  const ctx = useContext(WidgetActionsContext);
  if (!ctx) {
    throw new Error(
      "useWidgetActions must be used inside <WidgetActionsProvider>",
    );
  }
  return ctx;
}
