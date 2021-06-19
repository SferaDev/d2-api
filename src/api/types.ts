import { HttpRequest } from "../repositories/HttpClientRepository";
import { D2ApiDefinitionBase } from "./common";
import { Model } from ".";

export type D2ApiBackend = "xhr" | "fetch" | "engine";

export interface D2ApiOptions {
    baseUrl?: string;
    apiVersion?: number;
    auth?: { username: string; password: string };
    backend?: D2ApiBackend;
    timeout?: number;
}

export type IndexedModels<D2ApiDefinition extends D2ApiDefinitionBase> = {
    [ModelKey in keyof D2ApiDefinition["schemas"]]: Model<D2ApiDefinition, D2ApiDefinition["schemas"][ModelKey]>;
};

export interface D2ApiRequest extends HttpRequest {
    skipApiPrefix?: boolean;
}
