import { Ref } from "./../schemas/base";
import { D2ModelSchemas } from "./../schemas/models";
import _ from "lodash";
import { Selector } from "./inference";

export { D2ApiResponse } from "./api-response";

export interface GetOptionValue<ModelKey extends keyof D2ModelSchemas> {
    fields: Selector<D2ModelSchemas[ModelKey]>;
    filter?: Filter;
}

type FieldsSelector = object;

type FilterSingleOperator =
    | "eq"
    | "!eq"
    | "ne"
    | "like"
    | "!like"
    | "$like"
    | "!$like"
    | "like$"
    | "!like$"
    | "ilike"
    | "ilike"
    | "$ilike"
    | "!$ilike"
    | "ilike$"
    | "!ilike$"
    | "gt"
    | "ge"
    | "lt"
    | "le"
    | "null"
    | "!null"
    | "empty"
    | "token"
    | "!token";

type FilterCollectionOperator = "in" | "!in";

type FilterValue = Partial<
    Record<FilterSingleOperator, string> & Record<FilterCollectionOperator, string[]>
>;

export interface Filter {
    [property: string]: FilterValue | FilterValue[] | undefined;
}

function applyFieldTransformers(key: string, value: any) {
    if (value.hasOwnProperty("$fn")) {
        switch (value["$fn"]["name"]) {
            case "rename":
                return {
                    key: `${key}~rename(${value["$fn"]["to"]})`,
                    value: _.omit(value, ["$fn"]),
                };
            default:
                return { key, value };
        }
    } else {
        return { key, value };
    }
}

function getFieldsAsString(modelFields: FieldsSelector): string {
    return _(modelFields)
        .map((value0, key0: string) => {
            const { key, value } = applyFieldTransformers(key0, value0);

            if (typeof value === "boolean" || _.isEqual(value, {})) {
                return value ? key.replace(/^\$/, ":") : null;
            } else {
                return key + "[" + getFieldsAsString(value) + "]";
            }
        })
        .compact()
        .sortBy()
        .join(",");
}

function toArray<T>(itemOrItems: T | T[]): T[] {
    return Array.isArray(itemOrItems) ? itemOrItems : [itemOrItems];
}

function getFilterAsString(filter: Filter): string[] {
    return _.sortBy(
        _.flatMap(filter, (filterOrFilters, field) =>
            _.flatMap(toArray(filterOrFilters || []), filter =>
                _.compact(
                    _.map(filter, (value, op) =>
                        isEmptyFilterValue(value)
                            ? null
                            : op === "in" || op === "!in"
                            ? `${field}:${op}:[${(value as string[]).join(",")}]`
                            : `${field}:${op}:${value}`
                    )
                )
            )
        )
    );
}

export interface GetOptionGeneric {
    fields: FieldsSelector;
    filter: Filter;
}

function isEmptyFilterValue(val: any): boolean {
    return val === undefined || val === null || val === "";
}

export function processFieldsFilterParams(
    modelOptions: GetOptionGeneric,
    modelName?: string
): _.Dictionary<any> {
    const join = (s: string) => _.compact([modelName, s]).join(":");

    return _.pickBy({
        [join("fields")]: modelOptions.fields && getFieldsAsString(modelOptions.fields),
        [join("filter")]: modelOptions.filter && getFilterAsString(modelOptions.filter),
    });
}

export interface D2Response<Data> {
    status: number;
    data: Data;
    headers: _.Dictionary<string>;
}

export type D2ApiRequestParamsValue = string | number | boolean | undefined;

export interface Params {
    [key: string]: D2ApiRequestParamsValue | D2ApiRequestParamsValue[];
}

export interface ErrorReport {
    message: string;
    mainKlass: string;
    errorKlass: string;
    errorProperty: string;
    errorCode: string;
}

export interface HttpResponse<Response> {
    httpStatus: "OK" | "Conflict";
    httpStatusCode: number;
    status: "OK" | "ERROR";
    message?: string;
    response: Response;
}

export type PartialModel<T> = {
    [P in keyof T]?: T[P] extends (infer U)[]
        ? PartialModel<U>[]
        : T[P] extends object
        ? PartialModel<T[P]>
        : T[P];
};

export type PartialPersistedModel<T> = PartialModel<T> & Ref;

export type MetadataPayload = {
    [K in keyof D2ModelSchemas]: Array<PartialModel<D2ModelSchemas[K]["model"]>>;
};
