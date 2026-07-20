type MapExportAction = () => void;

let activeMapExportAction: MapExportAction | null = null;

/**
 * Keeps the map capture action reachable from the profile screen while the
 * map remains mounted underneath the navigation stack.
 */
export function registerMapExportAction(action: MapExportAction): () => void {
  activeMapExportAction = action;
  return () => {
    if (activeMapExportAction === action) activeMapExportAction = null;
  };
}

export function runMapExportAction(): boolean {
  if (!activeMapExportAction) return false;
  activeMapExportAction();
  return true;
}
