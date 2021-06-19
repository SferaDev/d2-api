import MockAdapter from "axios-mock-adapter";
import { CancelableResponse } from "./CancelableResponse";

export interface HttpClientRepository {
    request<Data>(options: HttpRequest): CancelableResponse<Data>;
    getMockAdapter(): MockAdapter;
}

export type Method = "get" | "post" | "put" | "delete";

type ParamValue = string | number | boolean;
export type Params = Record<string, ParamValue | ParamValue[] | undefined>;

export interface HttpRequest {
    method: Method;
    url: string;
    params?: Params;
    data?: unknown;
    dataType?: "json" | "raw";
    validateStatus?(status: number): boolean;
    timeout?: number;
    headers?: Record<string, string>;
}

export interface HttpResponse<Data> {
    status: number;
    data: Data;
    headers: Record<string, string>;
}

export interface Credentials {
    username: string;
    password: string;
}

export interface ConstructorOptions {
    baseUrl?: string;
    auth?: Credentials;
    timeout?: number;
}

interface HttpErrorOptions {
    request: HttpRequest;
    response?: HttpResponse<unknown>;
}

export class HttpError extends Error implements HttpErrorOptions {
    request: HttpRequest;
    response?: HttpResponse<unknown>;

    constructor(message: string, obj: HttpErrorOptions) {
        super(message);
        this.request = obj.request;
        this.response = obj.response;
    }
}

export function getBody(dataType: HttpRequest["dataType"], data: any) {
    switch (dataType) {
        case "json": {
            return JSON.stringify(data);
        }
        default: {
            return data;
        }
    }
}
