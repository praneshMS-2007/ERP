import { AuthService } from './auth.service';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    login(body: any): Promise<{
        token: string;
        user: {
            id: string;
            email: string;
            role: string;
            name: string;
        };
    }>;
    logout(authHeader: string): Promise<{
        message: string;
    }> | {
        message: string;
    };
}
