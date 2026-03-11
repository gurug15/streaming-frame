import { Router, Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { getData, getFrameFile } from './xtcParser';
import { jwtAuth } from '../middleware/jwtAuth';

const router = Router();

// ============ HELPERS ============

/**
 * Build the user-specific input directory path:
 *   <TRAJDIR>/<email>/gromacs/inputfiles/
 */
function getUserInputDir(email: string): string {
    const trajDir = process.env.TRAJDIR;
    if (!trajDir) {
        throw new Error('TRAJDIR environment variable is not set');
    }
    return path.join(trajDir, email, 'gromacs', 'inputfiles');
}

/**
 * Resolve a trajectory filename to a full path under the user's input directory.
 */
function resolveTrajectoryPath(email: string, filename: string): string | null {
    const userDir = getUserInputDir(email);

    const filePath = path.join(userDir, filename);
    if (fs.existsSync(filePath)) {
        return filePath;
    }

    return null;
}

// ============ OFFSET CACHE ============
// Cache offsets per file to avoid re-scanning on every request
const offsetCache = new Map<string, number[]>();

// ============ ROUTES ============
// All trajectory routes require JWT authentication

/**
 * GET /trajectory/:filename/start
 * Returns an array of byte offsets for each frame in the XTC file.
 */
router.get('/trajectory/:filename/start', jwtAuth, async (req: Request, res: Response): Promise<void> => {
    try {
        const filename = req.params.filename as string;
        const email = (req as any).userEmail as string;
        const filePath = resolveTrajectoryPath(email, filename);

        if (!filePath) {
            res.status(404).json({ error: `Trajectory file not found: ${filename}` });
            return;
        }

        // Check cache
        if (offsetCache.has(filePath)) {
            res.json(offsetCache.get(filePath));
            return;
        }

        console.log(`[offsets] User: ${email} | Scanning: ${filePath}`);
        const startTime = performance.now();

        const offsets = await getData(filePath);
        offsetCache.set(filePath, offsets);

        const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
        console.log(`[offsets] Found ${offsets.length} frames in ${elapsed}s`);

        res.json(offsets);
    } catch (err) {
        console.error('[offsets] Error:', err);
        res.status(500).json({ error: `Failed to get offsets: ${err}` });
    }
});

/**
 * GET /trajectory/:filename/offset/:start/:end
 * Reads bytes [start, end) from the XTC file, parses the frame(s), and returns them.
 * Response matches the FrameResponse type expected by the frontend.
 */
router.get('/trajectory/:filename/offset/:start/:end', jwtAuth, async (req: Request, res: Response): Promise<void> => {
    try {
        const filename = req.params.filename as string;
        const email = (req as any).userEmail as string;
        const startOffset = parseInt(req.params.start as string, 10);
        const endOffset = parseInt(req.params.end as string, 10);

        if (isNaN(startOffset) || isNaN(endOffset)) {
            res.status(400).json({ error: 'Invalid start/end offset' });
            return;
        }

        const filePath = resolveTrajectoryPath(email, filename);

        if (!filePath) {
            res.status(404).json({ error: `Trajectory file not found: ${filename}` });
            return;
        }

        // Clamp endOffset to actual file size to avoid reading past EOF
        const fileSize = fs.statSync(filePath).size;
        const clampedEnd = Math.min(endOffset, fileSize);

        const length = clampedEnd - startOffset;
        if (length <= 0) {
            res.status(400).json({ error: 'End offset must be greater than start offset' });
            return;
        }

        // Read the byte range from file
        const fd = fs.openSync(filePath, 'r');
        try {
            const buffer = Buffer.alloc(length);
            const bytesRead = fs.readSync(fd, buffer, 0, length, startOffset);

            if (bytesRead === 0) {
                res.status(400).json({ error: 'No data at specified offset' });
                return;
            }

            const data = new Uint8Array(buffer.buffer, buffer.byteOffset, bytesRead);

            // Parse the XTC frame, with fallback for last-frame edge cases
            let result;
            try {
                result = getFrameFile(data);
            } catch (parseErr) {
                // If parsing fails (e.g. truncated last frame), try to serve the previous frame
                const cachedOffsets = offsetCache.get(filePath);
                if (cachedOffsets && cachedOffsets.length >= 2) {
                    // Find the frame index for this startOffset
                    const frameIdx = cachedOffsets.indexOf(startOffset);
                    // Fall back to the previous frame
                    const fallbackIdx = frameIdx > 0 ? frameIdx - 1 : cachedOffsets.length - 2;
                    const fbStart = cachedOffsets[fallbackIdx];
                    const fbEnd = cachedOffsets[fallbackIdx + 1];
                    const fbLength = fbEnd - fbStart;
                    const fbBuffer = Buffer.alloc(fbLength);
                    const fbRead = fs.readSync(fd, fbBuffer, 0, fbLength, fbStart);
                    const fbData = new Uint8Array(fbBuffer.buffer, fbBuffer.byteOffset, fbRead);
                    result = getFrameFile(fbData);
                    console.warn(`[frame] Parse failed at offset ${startOffset}, served fallback frame ${fallbackIdx}`);
                } else {
                    throw parseErr;
                }
            }

            // Convert Float32Arrays to plain arrays for JSON serialization
            const jsonResult = {
                frames: result.frames.map(frame => ({
                    count: frame.count,
                    x: Array.from(frame.x),
                    y: Array.from(frame.y),
                    z: Array.from(frame.z),
                })),
                boxes: result.boxes,
                times: result.times,
                timeOffset: result.timeOffset,
                deltaTime: result.deltaTime,
            };

            res.json(jsonResult);
        } finally {
            fs.closeSync(fd);
        }
    } catch (err) {
        console.error('[frame] Error:', err);
        res.status(500).json({ error: `Failed to read frame: ${err}` });
    }
});

export default router;
