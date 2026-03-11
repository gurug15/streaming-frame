import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Same secret used in the Spring Boot backend (JwtHelper.java)
const JWT_SECRET =
    process.env.JWT_SECRET ||
    'afafasfafafasfasfasfafacasdasfasxASFACASDFACASDFASFASFDAFASFASDAADSCSDFADCVSGCFVADXCcadwavfsfarvf';

/**
 * Express middleware that extracts and verifies the JWT from the
 * Authorization header, then attaches `req.userEmail` for downstream use.
 */
export function jwtAuth(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Missing or invalid Authorization header' });
        return;
    }

    const token = authHeader.substring(7); // strip "Bearer "

    try {
        const decoded = jwt.verify(token, JWT_SECRET, {
            algorithms: ['HS512'],
        }) as jwt.JwtPayload;

        // The Spring Boot backend stores the user's email as the JWT subject
        const email = decoded.sub;
        if (!email) {
            res.status(401).json({ error: 'JWT does not contain a subject (email)' });
            return;
        }

        // Attach email to request for route handlers
        (req as any).userEmail = email;
        next();
    } catch (err) {
        console.error('[jwt] Verification failed:', err);
        res.status(401).json({ error: 'Invalid or expired token' });
    }
}
