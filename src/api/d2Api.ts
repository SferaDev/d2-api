import { AxiosHttpClientRepository } from "../data/AxiosHttpClientRepository";
import { FetchHttpClientRepository } from "../data/FetchHttpClientRepository";
import { Credentials, HttpClientRepository } from "../repositories/HttpClientRepository";
import { D2SchemaProperties } from "../schemas";
import { cache, defineLazyCachedProperty } from "../utils/cache";
import { joinPath } from "../utils/connection";
import { Analytics } from "./analytics";
import { AppHub } from "./appHub";
import { D2ApiDefinitionBase, D2ApiResponse, Params } from "./common";
import { CurrentUser } from "./currentUser";
import { DataStore } from "./dataStore";
import { DataValues } from "./dataValues";
import { Email } from "./email";
import { Events } from "./events";
import { Files } from "./files";
import { MessageConversations } from "./messageConversations";
import { Metadata } from "./metadata";
import { Model } from "./model";
import { Sharing } from "./sharing";
import { System } from "./system";
import { D2ApiBackend, D2ApiOptions, D2ApiRequest, IndexedModels } from "./types";
import { Maintenance } from "./maintenance";
import { EngineHttpClientRepository } from "../data/EngineHttpClientRepository";

export class D2ApiGeneric {
    public baseUrl: string;
    public apiPath: string;
    baseConnection: HttpClientRepository;
    apiConnection: HttpClientRepository;

    public constructor(options?: D2ApiOptions) {
        const { baseUrl = "http://localhost:8080", apiVersion, auth, backend = "xhr", timeout } = options || {};

        this.baseUrl = baseUrl;
        this.apiPath = joinPath(baseUrl, "api", apiVersion ? String(apiVersion) : null);
        this.baseConnection = this.getBackend(backend, { baseUrl, auth, timeout });
        this.apiConnection = this.getBackend(backend, { baseUrl: this.apiPath, auth, timeout });
    }

    private getBackend(
        backend: D2ApiBackend,
        options: { baseUrl: string; auth?: Credentials; timeout?: number }
    ): HttpClientRepository {
        switch (backend) {
            case "xhr":
                return new AxiosHttpClientRepository(options);
            case "fetch":
                return new FetchHttpClientRepository(options);
            case "engine":
                return new EngineHttpClientRepository(options);
        }
    }

    @cache()
    public getMockAdapter() {
        return this.apiConnection.getMockAdapter();
    }

    public request<T>(options: D2ApiRequest): D2ApiResponse<T> {
        const { skipApiPrefix = false, ...requestOptions } = options;
        const connection = skipApiPrefix ? this.baseConnection : this.apiConnection;
        return connection.request(requestOptions);
    }

    public get<T>(url: string, params?: Params) {
        return this.request<T>({ method: "get", url, params });
    }

    public post<T>(url: string, params?: Params, data?: object) {
        return this.request<T>({ method: "post", url, params, data });
    }

    public put<T>(url: string, params?: Params, data?: object) {
        return this.request<T>({ method: "put", url, params, data });
    }

    public delete<T>(url: string, params?: Params) {
        return this.request<T>({ method: "delete", url, params });
    }

    async getVersion(): Promise<string> {
        const info = await this.get<{ version: string }>("/system/info").getData();
        return info.version;
    }
}

export abstract class D2ApiVersioned<D2ApiDefinition extends D2ApiDefinitionBase> extends D2ApiGeneric {
    getIndexedModels(
        modelClass: any,
        modelKeys: Array<keyof D2ApiDefinition["schemas"]>
    ): IndexedModels<D2ApiDefinition> {
        const indexedModels: Partial<IndexedModels<D2ApiDefinition>> = {};
        modelKeys.forEach(key => {
            defineLazyCachedProperty(indexedModels, key, () => new modelClass(this, this.schemaModels[key]));
        });
        return indexedModels as IndexedModels<D2ApiDefinition>;
    }

    dataStore(namespace: string): DataStore {
        return new DataStore(this, "global", namespace);
    }

    userDataStore(namespace: string): DataStore {
        return new DataStore(this, "user", namespace);
    }

    constructor(
        private schemaModels: Record<keyof D2ApiDefinition["schemas"], D2SchemaProperties>,
        options?: D2ApiOptions
    ) {
        super(options);
    }

    get modelKeys(): Array<keyof D2ApiDefinition["schemas"]> | undefined {
        return this.schemaModels ? Object.keys(this.schemaModels) : undefined;
    }

    @cache()
    get metadata(): Metadata<D2ApiDefinition> {
        return new Metadata(this);
    }

    @cache()
    get models(): IndexedModels<D2ApiDefinition> {
        return this.getIndexedModels(Model, this.modelKeys || []);
    }

    @cache()
    get currentUser(): CurrentUser<D2ApiDefinition> {
        return new CurrentUser(this);
    }

    @cache()
    get analytics() {
        return new Analytics(this);
    }

    @cache()
    get dataValues() {
        return new DataValues(this);
    }

    @cache()
    get events() {
        return new Events(this);
    }

    @cache()
    get system() {
        return new System(this);
    }

    @cache()
    get sharing() {
        return new Sharing(this);
    }

    @cache()
    get messageConversations() {
        return new MessageConversations(this);
    }

    @cache()
    get email() {
        return new Email(this);
    }

    @cache()
    get files() {
        return new Files(this);
    }

    @cache()
    get appHub() {
        return new AppHub(this);
    }

    @cache()
    get maintenance() {
        return new Maintenance(this);
    }
}

export { D2ApiOptions };
