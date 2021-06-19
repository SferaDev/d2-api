import { DataEngine, Mutation, MutationType } from "@dhis2/app-service-data/build/types/engine";
import { RestAPILink } from "@dhis2/app-service-data/build/types/links";
import MockAdapter from "axios-mock-adapter";
import { CancelableResponse } from "../repositories/CancelableResponse";
import {
    ConstructorOptions,
    HttpClientRepository,
    HttpRequest,
    HttpResponse,
    Method,
} from "../repositories/HttpClientRepository";

export class EngineHttpClientRepository implements HttpClientRepository {
    private engine: DataEngine;

    constructor(public options: ConstructorOptions) {
        const link = new RestAPILink({ baseUrl: options.baseUrl ?? "", apiVersion: 37 });
        this.engine = new DataEngine(link);
    }

    request<Data>(options: HttpRequest): CancelableResponse<Data> {
        switch (options.method) {
            case "get":
                return this.query(options);
            case "post":
            case "put":
            case "delete":
                return this.mutate(options);
        }
    }

    query<Data>(options: HttpRequest): CancelableResponse<Data> {
        const controller = new AbortController();

        const engineResponse = this.engine.query(
            {
                request: {
                    resource: options.url,
                    params: options.params ?? {},
                    data: options.data,
                },
            },
            { signal: controller.signal }
        );

        const response: Promise<HttpResponse<Data>> = engineResponse.then(res => ({
            status: 200,
            data: res as unknown as Data,
            headers: {},
        }));

        return CancelableResponse.build({ response, cancel: () => controller.abort() });
    }

    mutate<Data>(options: HttpRequest): CancelableResponse<Data> {
        const controller = new AbortController();

        const { resource, id } = extractResource(options.url);

        const engineResponse = this.engine.mutate(
            {
                type: getMutationType(options.method),
                resource,
                id,
                params: options.params ?? {},
                data: options.data,
            } as Mutation,
            { signal: controller.signal }
        );

        const response: Promise<HttpResponse<Data>> = engineResponse.then(res => ({
            status: 200,
            data: res as unknown as Data,
            headers: {},
        }));

        return CancelableResponse.build({ response, cancel: () => controller.abort() });
    }

    getMockAdapter(): MockAdapter {
        throw new Error("Not implemented");
    }
}

function getMutationType(method: Method): MutationType {
    switch (method) {
        case "delete":
            return "delete";
        case "put":
            return "replace";
        case "post":
            return "create";
        default:
            return "create";
    }
}

const resourceRegex = /^(?<resource>.*)\/?(?<id>[a-zA-Z]{1}[a-zA-Z0-9]{10})?$/;

function extractResource(url: string): { resource: string; id: string } {
    const { groups = {} } = url.match(resourceRegex) ?? {};
    return { resource: groups.resource ?? "", id: groups.id ?? "" };
}
