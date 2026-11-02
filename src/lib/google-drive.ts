const DRIVE_API = "https://www.googleapis.com/drive/v3";

export type DriveFileRow = {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
};

export function getTextbookDriveFolderId() {
  return (
    process.env.GOOGLE_DRIVE_TEXTBOOK_FOLDER_ID?.trim() ||
    "10NxpupZ1VsEEQ_DkYRr-wZRnBg-EqlVz"
  );
}

export function getOptionalDriveApiKey() {
  const apiKey = process.env.GOOGLE_DRIVE_API_KEY?.trim();
  if (!apiKey || apiKey.includes("xxxxxxxx")) {
    return null;
  }
  return apiKey;
}

/** True when a textbook folder is configured (API key optional). */
export function isTextbookDriveConfigured() {
  return Boolean(getTextbookDriveFolderId());
}

async function listTextbookDriveFilesViaApi(
  folderId: string,
  apiKey: string,
): Promise<DriveFileRow[]> {
  const files: DriveFileRow[] = [];
  let pageToken: string | undefined;

  do {
    const query = new URLSearchParams({
      q: `'${folderId}' in parents and trashed=false`,
      fields: "nextPageToken,files(id,name,mimeType,size,modifiedTime)",
      orderBy: "name",
      pageSize: "100",
      key: apiKey,
    });
    if (pageToken) {
      query.set("pageToken", pageToken);
    }

    const response = await fetch(`${DRIVE_API}/files?${query.toString()}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        text.includes("API key not valid")
          ? "Google Drive API key is invalid or Drive API is not enabled."
          : `Google Drive list failed (${response.status}).`,
      );
    }

    const payload = (await response.json()) as {
      files?: DriveFileRow[];
      nextPageToken?: string;
    };
    files.push(...(payload.files ?? []));
    pageToken = payload.nextPageToken;
  } while (pageToken);

  return files;
}

/** Public folder listing when the folder is shared as "Anyone with the link". */
async function listTextbookDriveFilesViaEmbed(
  folderId: string,
): Promise<DriveFileRow[]> {
  const response = await fetch(
    `https://drive.google.com/embeddedfolderview?id=${encodeURIComponent(folderId)}`,
    {
      cache: "no-store",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; InclusiveMaths/1.0; +https://localhost)",
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      "Could not read the shared textbook folder. Check that it is shared as anyone with the link.",
    );
  }

  const html = await response.text();
  const files: DriveFileRow[] = [];
  const entryRegex =
    /id="entry-([a-zA-Z0-9_-]+)"[\s\S]*?flip-entry-title">\s*([^<]+?)\s*<\/div/gi;

  for (const match of html.matchAll(entryRegex)) {
    const id = match[1];
    const name = match[2]?.trim();
    if (!id || !name) {
      continue;
    }
    files.push({
      id,
      name,
      mimeType: "application/octet-stream",
    });
  }

  if (files.length === 0 && !html.includes("flip-entries")) {
    throw new Error(
      "The textbook folder appears empty or is not publicly listable.",
    );
  }

  files.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
  return files;
}

export async function listTextbookDriveFiles(): Promise<DriveFileRow[]> {
  const folderId = getTextbookDriveFolderId();
  const apiKey = getOptionalDriveApiKey();

  if (apiKey) {
    try {
      return await listTextbookDriveFilesViaApi(folderId, apiKey);
    } catch {
      // Fall back to embed listing for link-shared folders.
    }
  }

  return listTextbookDriveFilesViaEmbed(folderId);
}

export async function assertFileInTextbookFolder(fileId: string) {
  const files = await listTextbookDriveFiles();
  const file = files.find((entry) => entry.id === fileId);
  if (!file) {
    throw new Error("File is not in the textbook folder.");
  }
  return file;
}

export function publicDriveDownloadUrl(fileId: string) {
  return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`;
}

export function textbookDriveFolderUrl(folderId: string) {
  return `https://drive.google.com/drive/folders/${folderId}`;
}
