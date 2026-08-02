"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const prisma_service_1 = require("../prisma/prisma.service");
const bcrypt = __importStar(require("bcryptjs"));
let AuthService = class AuthService {
    prisma;
    jwtService;
    constructor(prisma, jwtService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
    }
    async login(email, passwordPlain) {
        const user = await this.prisma.user.findUnique({
            where: { email },
            include: {
                role: {
                    include: { permissions: true },
                },
                employee: true,
            },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const isMatch = await bcrypt.compare(passwordPlain, user.passwordHash);
        if (!isMatch) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const permissions = user.role.permissions.map((p) => ({
            module: p.module,
            action: p.action,
        }));
        const payload = {
            sub: user.id,
            email: user.email,
            role: user.role.name,
            permissions,
        };
        const token = this.jwtService.sign(payload);
        await this.prisma.authentication.create({
            data: {
                userId: user.id,
                token,
                expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
            },
        });
        return {
            token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role.name,
                permissions,
                name: user.employee
                    ? `${user.employee.firstName} ${user.employee.lastName}`
                    : 'Admin User',
            },
        };
    }
    async logout(token) {
        await this.prisma.authentication.updateMany({
            where: { token },
            data: { isActive: false },
        });
        return { message: 'Logged out successfully' };
    }
    async getProfile(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                role: { include: { permissions: true } },
                employee: true,
            },
        });
        if (!user)
            throw new common_1.UnauthorizedException('User not found');
        return user;
    }
    async updateProfile(userId, data) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { employee: true },
        });
        if (!user)
            throw new common_1.UnauthorizedException('User not found');
        if (user.employee) {
            await this.prisma.employee.update({
                where: { id: user.employee.id },
                data: {
                    firstName: data.firstName || user.employee.firstName,
                    lastName: data.lastName || user.employee.lastName,
                    contact: data.phone || user.employee.contact,
                    address: data.address || user.employee.address,
                    country: data.country || user.employee.country,
                    city: data.city || user.employee.city,
                },
            });
        }
        return { message: 'Profile updated successfully' };
    }
    async changePassword(userId, currentPass, newPass) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.UnauthorizedException('User not found');
        const isMatch = await bcrypt.compare(currentPass, user.passwordHash);
        if (!isMatch)
            throw new common_1.UnauthorizedException('Current password does not match');
        const passwordHash = await bcrypt.hash(newPass, 10);
        await this.prisma.user.update({
            where: { id: userId },
            data: { passwordHash },
        });
        return { message: 'Password updated successfully' };
    }
    async getSessions(userId) {
        return this.prisma.authentication.findMany({
            where: { userId, isActive: true },
            orderBy: { createdAt: 'desc' },
            take: 10,
        });
    }
    async revokeSession(userId, sessionId) {
        await this.prisma.authentication.updateMany({
            where: { id: sessionId, userId },
            data: { isActive: false },
        });
        return { message: 'Session revoked successfully' };
    }
    async validateToken(token) {
        try {
            const payload = this.jwtService.verify(token);
            return payload;
        }
        catch {
            throw new common_1.UnauthorizedException('Invalid or expired token');
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map