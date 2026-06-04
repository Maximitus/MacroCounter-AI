import {createContext, useContext, type ReactNode} from 'react';

export type MacroCloudSyncStatus = {
  cloudEnabled: boolean;
  syncing: boolean;
};

const defaultStatus: MacroCloudSyncStatus = {cloudEnabled: false, syncing: false};

const MacroCloudSyncContext = createContext<MacroCloudSyncStatus>(defaultStatus);

export function MacroCloudSyncProvider({
  value,
  children,
}: {
  value: MacroCloudSyncStatus;
  children: ReactNode;
}) {
  return <MacroCloudSyncContext.Provider value={value}>{children}</MacroCloudSyncContext.Provider>;
}

export function useMacroCloudSyncStatus(): MacroCloudSyncStatus {
  return useContext(MacroCloudSyncContext);
}
