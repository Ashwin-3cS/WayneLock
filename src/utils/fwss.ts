import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

// Ensure environment variables are loaded or handle missing ones gracefully
const s3Client = new S3Client({
    endpoint: import.meta.env.VITE_FWSS_ENDPOINT || "https://s3.filebase.com", // Fallback if FWSS endpoint changes
    region: "us-east-1",
    credentials: {
        accessKeyId: import.meta.env.VITE_FWSS_API_KEY || "dummy",
        secretAccessKey: import.meta.env.VITE_FWSS_SECRET_KEY || "dummy"
    }
});

const BUCKET_NAME = import.meta.env.VITE_FWSS_BUCKET || "plgenesis-vaults";

export async function uploadVaultBlob(encryptedBlob: Uint8Array, userAddress: string): Promise<string> {
    const objectKey = `vaults/${userAddress}.bin`;

    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: objectKey,
        Body: encryptedBlob,
        ContentType: "application/octet-stream"
    });

    try {
        await s3Client.send(command);
        return `s3://${BUCKET_NAME}/${objectKey}`;
    } catch (error) {
        console.error("FWSS Upload Error:", error);
        throw new Error("Failed to upload vault to FWSS");
    }
}

export async function fetchVaultBlob(uri: string): Promise<Uint8Array> {
    // Parse s3://bucket/key URI
    const urlPattern = /^s3:\/\/([^\/]+)\/(.+)$/;
    const match = uri.match(urlPattern);
    if (!match) throw new Error("Invalid FWSS URI format");

    const [, bucket, key] = match;

    const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key
    });

    try {
        const response = await s3Client.send(command);
        if (!response.Body) throw new Error("Empty body returned from FWSS");

        // Handle web stream response
        const reader = response.Body.transformToByteArray();
        return await reader;
    } catch (error) {
        console.error("FWSS Fetch Error:", error);
        throw new Error("Failed to fetch vault from FWSS");
    }
}
