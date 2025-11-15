import * as vscode from 'vscode';

const MODULES_DIR_NAME = 'sciter_modules';

// Base URL where the .d.ts files live in sciter-intellisense repo
const TYPINGS_BASE_URL =
  'https://raw.githubusercontent.com/shujaatak/sciter-intellisense/main/sciter_modules';

// All declaration files that must be downloaded
const TYPINGS_FILES = [
  'Element.d.ts',
  'Element.selection.d.ts',
  'Element.state.d.ts',
  'Element.style.d.ts',
  'Event.d.ts',
  'Graphics.d.ts',
  'Node.d.ts',
  'Window.d.ts',
  'behaviors.d.ts',
  'document.d.ts',
  'global.d.ts',
  'jsx.d.ts',
  'module-debug.d.ts',
  'module-env.d.ts',
  'module-sciter.d.ts',
  'module-storage.d.ts',
  'module-sys.d.ts',
] as const;

const STATE_KEY_ETAG_PREFIX = 'sciter_typings_etag:';

type TypingsFileName = (typeof TYPINGS_FILES)[number];

interface FetchResult {
  text: string | null;
  etag?: string;
  notModified?: boolean;
}

let globalState: vscode.Memento | undefined;
let extensionUri: vscode.Uri | undefined;

async function fetchText(url: string, etag?: string): Promise<FetchResult> {
  const headers: Record<string, string> = {};
  if (etag) {
    headers['If-None-Match'] = etag;
  }

  const res = await fetch(url, { headers });

  if (res.status === 304) {
    return { text: null, etag, notModified: true };
  }

  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }

  const newEtag = res.headers.get('etag') ?? undefined;
  const text = await res.text();

  return { text, etag: newEtag, notModified: false };
}

async function ensureJsConfig(folder: vscode.WorkspaceFolder) {
  const jsconfigUri = vscode.Uri.joinPath(folder.uri, 'jsconfig.json');
  try {
    await vscode.workspace.fs.stat(jsconfigUri);
    // jsconfig.json already exists – respect user's existing config
    return;
  } catch {
    // file does not exist: create a minimal, Sciter-friendly config
  }

  const jsconfig = {
    compilerOptions: {
      checkJs: true,
      target: 'ES2020',
      module: 'ESNext',
      allowJs: true,
      moduleResolution: 'Bundler',
      lib: ['ES2020', 'DOM'],
      types: [] as string[],
    },
    include: ['**/*.js', `${MODULES_DIR_NAME}/**/*.d.ts`],
    exclude: ['node_modules', 'dist', 'out'],
  };

  await vscode.workspace.fs.writeFile(
    jsconfigUri,
    Buffer.from(JSON.stringify(jsconfig, null, 2), 'utf-8'),
  );
}

async function ensureModulesDirectory(
  folder: vscode.WorkspaceFolder,
): Promise<vscode.Uri> {
  const dirUri = vscode.Uri.joinPath(folder.uri, MODULES_DIR_NAME);
  await vscode.workspace.fs.createDirectory(dirUri);
  return dirUri;
}

async function readBundledTypingFile(fileName: TypingsFileName): Promise<string> {
  if (!extensionUri) {
    throw new Error('Extension URI not initialized for fallback typings.');
  }

  // The sciter_modules folder is parallel to package.json in the extension itself.
  const bundledUri = vscode.Uri.joinPath(extensionUri, MODULES_DIR_NAME, fileName);
  const content = await vscode.workspace.fs.readFile(bundledUri);
  return new TextDecoder('utf-8').decode(content);
}

async function writeTypingFile(
  dirUri: vscode.Uri,
  fileName: TypingsFileName,
  text: string,
): Promise<vscode.Uri> {
  const fileUri = vscode.Uri.joinPath(dirUri, fileName);
  await vscode.workspace.fs.writeFile(fileUri, Buffer.from(text, 'utf-8'));
  return fileUri;
}

function getEtagStateKey(folder: vscode.WorkspaceFolder, fileName: TypingsFileName): string {
  return `${STATE_KEY_ETAG_PREFIX}${folder.uri.toString()}:${fileName}`;
}

async function downloadTypingsForFolder(
  folder: vscode.WorkspaceFolder,
  {
    useEtag = false,
  }: {
    useEtag?: boolean;
  } = {},
): Promise<vscode.Uri[]> {
  const dirUri = await ensureModulesDirectory(folder);
  const writtenUris: vscode.Uri[] = [];

  for (const fileName of TYPINGS_FILES) {
    const url = `${TYPINGS_BASE_URL}/${fileName}`;
    const stateKey = getEtagStateKey(folder, fileName);
    const prevEtag = useEtag ? globalState?.get<string>(stateKey) : undefined;

    try {
      const res = await fetchText(url, prevEtag);

      if (res.notModified) {
        // Nothing changed for this file; do not overwrite
        continue;
      }

      if (res.text) {
        const uri = await writeTypingFile(dirUri, fileName, res.text);
        writtenUris.push(uri);

        if (res.etag) {
          await globalState?.update(stateKey, res.etag);
        }
      }
    } catch (networkError: any) {
      // Network failed: fall back to bundled copy inside the extension
      try {
        const fallbackText = await readBundledTypingFile(fileName);
        const uri = await writeTypingFile(dirUri, fileName, fallbackText);
        writtenUris.push(uri);
      } catch (fallbackError: any) {
        console.error(
          `Sciter: Failed to update typings for ${fileName} in ${folder.name}. Network error: ${
            networkError?.message || networkError
          }, fallback error: ${fallbackError?.message || fallbackError}`,
        );
        // Do not rethrow – we want to try other files and not completely fail the command.
      }
    }
  }

  return writtenUris;
}

/**
 * Completely reset typings for a folder:
 * - Delete sciter_modules (if present)
 * - Clear stored ETags for this folder
 */
async function resetTypingsForFolder(folder: vscode.WorkspaceFolder): Promise<void> {
  const dirUri = vscode.Uri.joinPath(folder.uri, MODULES_DIR_NAME);

  // Delete sciter_modules folder (if it exists)
  try {
    await vscode.workspace.fs.delete(dirUri, { recursive: true, useTrash: false });
  } catch {
    // Ignore if it doesn't exist
  }

  // Clear all etags for this folder
  if (globalState) {
    for (const fileName of TYPINGS_FILES) {
      const stateKey = getEtagStateKey(folder, fileName);
      await globalState.update(stateKey, undefined);
    }
  }
}

async function initIntellisense(folder?: vscode.WorkspaceFolder) {
  const pickedFolder = folder || (await pickFolder());

  if (!pickedFolder) {
    vscode.window.showWarningMessage('Sciter: No workspace folder selected.');
    return;
  }

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Sciter: Initializing IntelliSense…',
      cancellable: false,
    },
    async () => {
      try {
        const uris = await downloadTypingsForFolder(pickedFolder, { useEtag: false });

        if (!uris.length) {
          throw new Error('No typings files could be written.');
        }

        await ensureJsConfig(pickedFolder);
        vscode.window.showInformationMessage(
          `Sciter: IntelliSense initialized. Declaration files stored in "${MODULES_DIR_NAME}" for "${pickedFolder.name}".`,
        );
      } catch (err: any) {
        vscode.window.showErrorMessage(
          `Sciter: Initialize failed – ${err?.message || String(err)}`,
        );
      }
    },
  );
}

async function updateIntellisenseAll() {
  const folders = vscode.workspace.workspaceFolders || [];
  if (!folders.length) {
    return;
  }

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Sciter: Updating IntelliSense (full reset)…',
      cancellable: false,
    },
    async () => {
      for (const folder of folders) {
        try {
          // Treat update as full reinitialize:
          // 1. Delete sciter_modules
          // 2. Clear etags
          // 3. Re-download all typings without using ETag
          await resetTypingsForFolder(folder);
          const uris = await downloadTypingsForFolder(folder, { useEtag: false });

          if (uris.length === 0) {
            console.warn(
              `Sciter: No typings written during update for "${folder.name}".`,
            );
          }

          // Ensure jsconfig is present (don't overwrite if it already exists)
          await ensureJsConfig(folder);
        } catch (err: any) {
          console.error(
            `Sciter: Failed to update IntelliSense in "${folder.name}": ${
              err?.message || String(err)
            }`,
          );
        }
      }

      vscode.window.showInformationMessage(
        'Sciter: IntelliSense update completed (sciter_modules refreshed).',
      );
    },
  );
}

async function pickFolder(): Promise<vscode.WorkspaceFolder | undefined> {
  const folders = vscode.workspace.workspaceFolders || [];

  if (folders.length === 1) {
    return folders[0];
  }

  if (folders.length === 0) {
    return undefined;
  }

  const picked = await vscode.window.showWorkspaceFolderPick({
    placeHolder: `Select a workspace folder to initialize Sciter IntelliSense (creates "${MODULES_DIR_NAME}" there).`,
  });

  return picked || undefined;
}

export function activate(context: vscode.ExtensionContext) {
  globalState = context.globalState;
  extensionUri = context.extensionUri;

  const initCmd = vscode.commands.registerCommand('SciterJS.initIntellisense', () =>
    initIntellisense(),
  );
  const updateCmd = vscode.commands.registerCommand(
    'SciterJS.updateIntellisense',
    () => updateIntellisenseAll(),
  );

  context.subscriptions.push(initCmd, updateCmd);
}

export function deactivate() {}
