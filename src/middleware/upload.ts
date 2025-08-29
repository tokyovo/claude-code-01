import multer, { StorageEngine, FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { config } from '@/config/env';
import { AppError } from './errorHandler';

// File upload configuration
interface UploadConfig {
  destination: string;
  maxFileSize: number;
  allowedMimeTypes: string[];
  maxFiles: number;
  preserveFileName: boolean;
}

// Default configurations for different upload types
const UPLOAD_CONFIGS: Record<string, UploadConfig> = {
  receipts: {
    destination: path.join(process.cwd(), 'uploads', 'receipts'),
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
    ],
    maxFiles: 5,
    preserveFileName: false,
  },
  profilePictures: {
    destination: path.join(process.cwd(), 'uploads', 'profiles'),
    maxFileSize: 2 * 1024 * 1024, // 2MB
    allowedMimeTypes: [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
    ],
    maxFiles: 1,
    preserveFileName: false,
  },
  documents: {
    destination: path.join(process.cwd(), 'uploads', 'documents'),
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
    ],
    maxFiles: 3,
    preserveFileName: true,
  },
};

// Ensure upload directories exist
const ensureUploadDirectories = (): void => {
  Object.values(UPLOAD_CONFIGS).forEach(config => {
    if (!fs.existsSync(config.destination)) {
      fs.mkdirSync(config.destination, { recursive: true });
      console.log(`Created upload directory: ${config.destination}`);
    }
  });
};

// Initialize upload directories
ensureUploadDirectories();

// Generate unique filename
const generateFileName = (originalName: string, preserveOriginal: boolean = false): string => {
  if (preserveOriginal) {
    const timestamp = Date.now();
    const randomBytes = crypto.randomBytes(6).toString('hex');
    const ext = path.extname(originalName);
    const baseName = path.basename(originalName, ext);
    return `${baseName}_${timestamp}_${randomBytes}${ext}`;
  }
  
  const timestamp = Date.now();
  const randomBytes = crypto.randomBytes(8).toString('hex');
  const ext = path.extname(originalName);
  return `${timestamp}_${randomBytes}${ext}`;
};

// Create storage engine
const createStorage = (uploadType: string): StorageEngine => {
  const config = UPLOAD_CONFIGS[uploadType];
  if (!config) {
    throw new Error(`Unknown upload type: ${uploadType}`);
  }
  
  return multer.diskStorage({
    destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
      // Create user-specific subdirectory if user is authenticated
      const userId = (req as any).userId;
      const userDir = userId ? path.join(config.destination, userId) : config.destination;
      
      if (!fs.existsSync(userDir)) {
        fs.mkdirSync(userDir, { recursive: true });
      }
      
      cb(null, userDir);
    },
    filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
      const fileName = generateFileName(file.originalname, config.preserveFileName);
      cb(null, fileName);
    },
  });
};

// File filter function
const createFileFilter = (uploadType: string) => {
  const config = UPLOAD_CONFIGS[uploadType];
  
  return (req: Request, file: Express.Multer.File, cb: FileFilterCallback): void => {
    // Check MIME type
    if (!config.allowedMimeTypes.includes(file.mimetype)) {
      return cb(new AppError(
        `Invalid file type. Allowed types: ${config.allowedMimeTypes.join(', ')}`,
        400
      ));
    }
    
    // Check file extension as additional security
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = config.allowedMimeTypes.map(mime => {
      switch (mime) {
        case 'image/jpeg':
        case 'image/jpg':
          return '.jpg';
        case 'image/png':
          return '.png';
        case 'image/gif':
          return '.gif';
        case 'image/webp':
          return '.webp';
        case 'application/pdf':
          return '.pdf';
        case 'text/plain':
          return '.txt';
        default:
          return '';
      }
    }).filter(Boolean);
    
    if (!allowedExtensions.includes(ext)) {
      return cb(new AppError(
        `Invalid file extension. Allowed extensions: ${allowedExtensions.join(', ')}`,
        400
      ));
    }
    
    cb(null, true);
  };
};

// Create multer instance for specific upload type
const createMulterInstance = (uploadType: string) => {
  const config = UPLOAD_CONFIGS[uploadType];
  
  return multer({
    storage: createStorage(uploadType),
    fileFilter: createFileFilter(uploadType),
    limits: {
      fileSize: config.maxFileSize,
      files: config.maxFiles,
      fields: 10, // Limit non-file fields
      fieldSize: 1024 * 1024, // 1MB per field
    },
  });
};

// Receipt upload middleware
export const uploadReceipt = createMulterInstance('receipts').single('receipt');
export const uploadMultipleReceipts = createMulterInstance('receipts').array('receipts', 5);

// Profile picture upload middleware
export const uploadProfilePicture = createMulterInstance('profilePictures').single('profilePicture');

// Document upload middleware
export const uploadDocument = createMulterInstance('documents').single('document');
export const uploadMultipleDocuments = createMulterInstance('documents').array('documents', 3);

// Generic upload middleware factory
export const createUploadMiddleware = (
  uploadType: string,
  fieldName: string,
  multiple: boolean = false,
  maxCount?: number
) => {
  const multerInstance = createMulterInstance(uploadType);
  
  if (multiple) {
    return multerInstance.array(fieldName, maxCount || UPLOAD_CONFIGS[uploadType].maxFiles);
  }
  
  return multerInstance.single(fieldName);
};

// File validation middleware (additional security layer)
export const validateUploadedFile = (req: Request, res: Response, next: NextFunction): void => {
  const file = req.file;
  const files = req.files as Express.Multer.File[];
  
  if (!file && !files) {
    return next();
  }
  
  const filesToValidate = file ? [file] : (Array.isArray(files) ? files : []);
  
  for (const uploadedFile of filesToValidate) {
    // Additional file validation
    if (uploadedFile.size === 0) {
      return next(new AppError('Empty files are not allowed', 400));
    }
    
    // Check for potentially dangerous file names
    if (uploadedFile.originalname.includes('..') || uploadedFile.originalname.includes('/')) {
      return next(new AppError('Invalid file name', 400));
    }
    
    // Validate file headers (magic numbers) for images
    if (uploadedFile.mimetype.startsWith('image/')) {
      try {
        const buffer = fs.readFileSync(uploadedFile.path, { encoding: null });
        if (!isValidImageFile(buffer, uploadedFile.mimetype)) {
          // Delete the invalid file
          fs.unlinkSync(uploadedFile.path);
          return next(new AppError('Invalid image file format', 400));
        }
      } catch (error) {
        return next(new AppError('Error validating uploaded file', 500));
      }
    }
  }
  
  next();
};

// Validate image file using magic numbers
const isValidImageFile = (buffer: Buffer, mimeType: string): boolean => {
  const magicNumbers: Record<string, number[][]> = {
    'image/jpeg': [[0xFF, 0xD8, 0xFF]],
    'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
    'image/gif': [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]],
    'image/webp': [[0x52, 0x49, 0x46, 0x46, null, null, null, null, 0x57, 0x45, 0x42, 0x50]],
  };
  
  const signatures = magicNumbers[mimeType];
  if (!signatures) return true; // Skip validation for unknown types
  
  return signatures.some(signature => {
    return signature.every((byte, index) => {
      return byte === null || buffer[index] === byte;
    });
  });
};

// File cleanup middleware (for handling upload errors)
export const cleanupFailedUploads = (err: any, req: Request, res: Response, next: NextFunction): void => {
  const file = req.file;
  const files = req.files as Express.Multer.File[];
  
  if (err) {
    // Clean up uploaded files if there was an error
    const filesToCleanup = file ? [file] : (Array.isArray(files) ? files : []);
    
    filesToCleanup.forEach(uploadedFile => {
      if (uploadedFile.path && fs.existsSync(uploadedFile.path)) {
        try {
          fs.unlinkSync(uploadedFile.path);
          console.log(`Cleaned up failed upload: ${uploadedFile.path}`);
        } catch (cleanupError) {
          console.error('Error cleaning up file:', cleanupError);
        }
      }
    });
  }
  
  next(err);
};

// Middleware to process uploaded files (resize, optimize, etc.)
export const processUploadedFiles = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const file = req.file;
  const files = req.files as Express.Multer.File[];
  
  if (!file && !files) {
    return next();
  }
  
  try {
    const filesToProcess = file ? [file] : (Array.isArray(files) ? files : []);
    
    for (const uploadedFile of filesToProcess) {
      // Add file metadata to the file object
      (uploadedFile as any).uploadedAt = new Date().toISOString();
      (uploadedFile as any).uploadedBy = (req as any).userId || 'anonymous';
      (uploadedFile as any).fileId = crypto.randomUUID();
      
      // For images, we could add image processing here
      if (uploadedFile.mimetype.startsWith('image/')) {
        // Placeholder for image processing (resize, optimize, etc.)
        // This could be implemented using libraries like sharp or jimp
        console.log(`Processing image: ${uploadedFile.filename}`);
      }
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

// Get file metadata
export const getFileMetadata = (filePath: string): any => {
  try {
    const stats = fs.statSync(filePath);
    const ext = path.extname(filePath);
    
    return {
      size: stats.size,
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime,
      extension: ext,
      isImage: ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext.toLowerCase()),
      isPdf: ext.toLowerCase() === '.pdf',
    };
  } catch (error) {
    return null;
  }
};

// Delete file utility
export const deleteFile = async (filePath: string): Promise<boolean> => {
  try {
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};

// Middleware to serve uploaded files with access control
export const serveUploadedFile = (req: Request, res: Response, next: NextFunction): void => {
  const { filename } = req.params;
  const userId = (req as any).userId;
  
  if (!userId) {
    return next(new AppError('Authentication required to access files', 401));
  }
  
  // Construct file path (assuming user-specific directories)
  const filePath = path.join(process.cwd(), 'uploads', 'receipts', userId, filename);
  
  if (!fs.existsSync(filePath)) {
    return next(new AppError('File not found', 404));
  }
  
  // Security check: ensure file is within allowed directory
  const resolvedPath = path.resolve(filePath);
  const allowedDir = path.resolve(path.join(process.cwd(), 'uploads'));
  
  if (!resolvedPath.startsWith(allowedDir)) {
    return next(new AppError('Access denied', 403));
  }
  
  // Set appropriate headers
  const metadata = getFileMetadata(filePath);
  if (metadata) {
    res.setHeader('Content-Length', metadata.size);
    
    if (metadata.isImage) {
      res.setHeader('Content-Type', `image/${path.extname(filename).substring(1)}`);
    } else if (metadata.isPdf) {
      res.setHeader('Content-Type', 'application/pdf');
    }
  }
  
  // Stream the file
  res.sendFile(resolvedPath);
};