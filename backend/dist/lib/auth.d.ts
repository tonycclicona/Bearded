export interface JwtPayload {
    userId: string;
    email: string;
    role: string;
}
export declare function generateToken(payload: JwtPayload): string;
export declare function verifyToken(token: string): JwtPayload;
export declare function extractTokenFromHeader(authHeader: string | undefined): string;
//# sourceMappingURL=auth.d.ts.map