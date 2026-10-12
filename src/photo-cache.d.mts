export function createPhotoCache(): {load(url: string): Promise<string>; retain(): () => void; dispose(): void};
