import { Storage } from '@google-cloud/storage';
import path from 'path';

// Instantiate the GCP storage client
const storage = new Storage();

// Change this to your preferred bucket name
const BUCKET_NAME = process.env.GCP_BUCKET_NAME || 'pulse-documents-lad-bucket';

/**
 * Upload a file buffer to GCP Cloud Storage
 * @param {Buffer} buffer - File buffer
 * @param {string} originalName - Original file name with extension
 * @param {string} mimetype - File mime type
 * @param {string} folder - Destination folder in bucket
 * @returns {Promise<string>} - The public or authenticated URL of the uploaded file
 */
export async function uploadFileToGCS(buffer, originalName, mimetype, folder = 'documents') {
    try {
        const bucket = storage.bucket(BUCKET_NAME);

        // Create a unique filename
        const fileExtension = path.extname(originalName);
        const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substring(2)}${fileExtension}`;
        const destination = `${folder}/${uniqueFilename}`;

        const file = bucket.file(destination);

        // Save the buffer to GCS
        await file.save(buffer, {
            metadata: {
                contentType: mimetype,
            },
            resumable: false,
        });

        return `https://storage.googleapis.com/${BUCKET_NAME}/${destination}`;
    } catch (error) {
        console.error('[gcp.storage] Error uploading to GCS:', error);
        throw new Error('Failed to upload document to cloud storage: ' + error.message);
    }
}

/**
 * Delete a file from GCP Cloud Storage
 * @param {string} fileUrl - Full URL to the file
 * @returns {Promise<boolean>}
 */
export async function deleteFileFromGCS(fileUrl) {
    try {
        const bucket = storage.bucket(BUCKET_NAME);

        // Extract file path from URL
        const urlPattern = new RegExp(`https://storage.googleapis.com/${BUCKET_NAME}/(.+)`);
        const match = fileUrl.match(urlPattern);

        if (match && match[1]) {
            const filePath = match[1];
            await bucket.file(filePath).delete();
            return true;
        }

        return false;
    } catch (error) {
        console.error('[gcp.storage] Error deleting from GCS:', error);
        return false;
    }
}

/**
 * Get a ReadStream for a file from GCP Cloud Storage
 * @param {string} fileUrl - Full URL to the file
 * @returns {import('@google-cloud/storage').File} A GCS File object from which .createReadStream() can be called
 */
export function getFileFromGCS(fileUrl) {
    const bucket = storage.bucket(BUCKET_NAME);
    const urlPattern = new RegExp(`https://storage.googleapis.com/${BUCKET_NAME}/(.+)`);
    const match = fileUrl.match(urlPattern);

    if (match && match[1]) {
        const filePath = match[1];
        return bucket.file(filePath);
    }
    throw new Error('Invalid GCS URL');
}
