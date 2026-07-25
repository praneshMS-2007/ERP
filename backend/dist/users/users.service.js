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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const bcrypt = __importStar(require("bcryptjs"));
let UsersService = class UsersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getUsers() {
        const users = await this.prisma.user.findMany({
            include: { role: true, employee: { select: { firstName: true, lastName: true } } },
            orderBy: { createdAt: 'desc' },
        });
        return users.map((u) => ({
            id: u.id,
            email: u.email,
            role: u.role.name,
            employee: u.employee,
            createdAt: u.createdAt,
        }));
    }
    async getUserById(id) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            include: { role: true, employee: { include: { department: true, designation: true } } },
        });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        return {
            id: user.id,
            email: user.email,
            role: user.role,
            employee: user.employee,
            createdAt: user.createdAt,
        };
    }
    async createUser(data) {
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(data.passwordHash, salt);
        return this.prisma.user.create({
            data: { ...data, passwordHash },
            select: { id: true, email: true, roleId: true, createdAt: true },
        });
    }
    async updateUser(id, email, roleId, password) {
        const data = {};
        if (email)
            data.email = email;
        if (roleId)
            data.roleId = roleId;
        if (password) {
            const salt = await bcrypt.genSalt(10);
            data.passwordHash = await bcrypt.hash(password, salt);
        }
        const user = await this.prisma.user.update({
            where: { id },
            data,
            include: { role: true },
        });
        return { message: 'User updated', user: { id: user.id, email: user.email, role: user.role.name } };
    }
    async deleteUser(id) {
        await this.prisma.authentication.deleteMany({ where: { userId: id } });
        await this.prisma.user.delete({ where: { id } });
        return { message: 'User deleted' };
    }
    async getRoles() {
        return this.prisma.role.findMany({ include: { permissions: true } });
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map