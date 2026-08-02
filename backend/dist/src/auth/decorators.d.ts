export declare const IS_PUBLIC_KEY = "isPublic";
export declare const Public: () => import("@nestjs/common").CustomDecorator<string>;
export declare const PERMISSION_KEY = "requiredPermission";
export interface RequiredPermission {
    module: string;
    action: string;
}
export declare const RequirePermission: (module: string, action: string) => import("@nestjs/common").CustomDecorator<string>;
export declare const CurrentUser: (...dataOrPipes: unknown[]) => ParameterDecorator;
