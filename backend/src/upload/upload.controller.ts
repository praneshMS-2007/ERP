import { Controller, Post, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

// Was @Public() — anyone on the internet could POST arbitrary files to this
// server with no login at all. Any authenticated user can upload; that is
// still broad, but it closes the unauthenticated hole. If per-module upload
// permissions are needed later (e.g. only HR uploading onboarding documents),
// add @RequirePermission(...) once this is wired to a specific feature.
//
// The result lands under the public /uploads static mount (see main.ts) —
// fine for the attachments/avatars this endpoint actually serves (rendered
// via plain <img>/<a> tags, which can't attach an auth header), but that
// means anything accepted here is publicly, permanently fetchable. The MIME
// allow-list below exists specifically to stop someone uploading an
// HTML/SVG file that the browser would execute as script from this same
// origin (stored XSS) — genuinely sensitive documents (payslips, offer
// letters, certificates) never go through this endpoint; see
// PayslipService/OfferLetterService/InternshipCertificateService, which
// write to private-uploads and require an authenticated, ownership-checked
// download instead.
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]);

@Controller('upload')
export class UploadController {
  @Post('file')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req: any, file: any, callback: any) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          callback(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
      fileFilter: (req: any, file: any, callback: any) => {
        if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
          return callback(new BadRequestException('Only PDF, JPG, PNG, GIF, and WEBP files are accepted.'), false);
        }
        callback(null, true);
      },
    }),
  )
  uploadFile(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return {
      filename: file.filename,
      originalname: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
      url: `/uploads/${file.filename}`,
    };
  }
}
