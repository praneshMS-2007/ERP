import { Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

// The server isn't always launched from backend/ (a deployment may start it
// from the repo root), so a bare process.cwd() join silently misses and every
// PDF falls back to its no-logo text header. Probe the known layouts instead.
function resolveAssetsRoot(): string {
  const candidates = [
    path.join(process.cwd(), 'assets'),
    path.join(process.cwd(), 'backend', 'assets'),
    path.resolve(__dirname, '..', '..', 'assets'), // src/common (ts-node)
    path.resolve(__dirname, '..', '..', '..', 'assets'), // dist/src/common (compiled)
  ];
  const found = candidates.find((p) => fs.existsSync(path.join(p, 'brand')));
  if (!found) {
    new Logger('BrandAssets').warn(
      `assets/brand not found (tried: ${candidates.join(', ')}); documents will render without logos`,
    );
  }
  return found ?? candidates[0];
}

const ASSETS_ROOT = resolveAssetsRoot();
export const BRAND_ASSETS_DIR = path.join(ASSETS_ROOT, 'brand');
export const FONT_ASSETS_DIR = path.join(ASSETS_ROOT, 'fonts');
