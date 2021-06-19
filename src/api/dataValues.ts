import { Id } from "../schemas";
import { AsyncPostResponse, D2ApiResponse } from "./common";
import { D2ApiGeneric } from "./d2Api";

export interface DataValueSetsPostRequest {
    dataSet?: Id;
    completeDate?: string;
    period?: string;
    orgUnit?: Id;
    attributeOptionCombo?: Id;
    dataValues: Array<{
        dataElement: Id;
        value: string;
        orgUnit?: Id;
        period?: string;
        attributeOptionCombo?: Id;
        categoryOptionCombo?: Id;
        comment?: string;
    }>;
}

export type DataValueSetsPostParams = Partial<{
    dataElementIdScheme?: IdScheme;
    orgUnitIdScheme?: IdScheme;
    categoryOptionComboIdScheme?: IdScheme;
    idScheme?: IdScheme;
    preheatCache: boolean;
    dryRun: boolean;
    importStrategy: ImportStrategy;
    skipExistingCheck: boolean;
    skipAudit: boolean;
    force: boolean;
}>;

type ImportStrategy =
    | "CREATE"
    | "UPDATE"
    | "CREATE_AND_UPDATE"
    | "DELETE"
    | "NEW_AND_UPDATES"
    | "NEW"
    | "UPDATES"
    | "DELETES";

export interface DataValueSetsPostResponse {
    responseType: "ImportSummary";
    status: "SUCCESS" | "ERROR" | "WARNING";
    description: string;
    importOptions: {
        idSchemes: object;
        dryRun: boolean;
        async: boolean;
        importStrategy: ImportStrategy;
        mergeMode: string;
        reportMode: string;
        skipExistingCheck: boolean;
        sharing: boolean;
        skipNotifications: boolean;
        skipAudit: boolean;
        datasetAllowsPeriods: boolean;
        strictPeriods: boolean;
        strictDataElements: boolean;
        strictCategoryOptionCombos: boolean;
        strictAttributeOptionCombos: boolean;
        strictOrganisationUnits: boolean;
        requireCategoryOptionCombo: boolean;
        requireAttributeOptionCombo: boolean;
        skipPatternValidation: boolean;
        ignoreEmptyCollection: boolean;
        force: boolean;
        firstRowIsHeader: boolean;
        skipLastUpdated: boolean;
    };
    importCount: {
        imported: number;
        updated: number;
        ignored: number;
        deleted: number;
    };
    dataSetComplete: boolean;
    conflicts?: Array<{
        object: Id;
        value: string;
    }>;
}

type IdScheme = string;

export type DataValueSetsGetRequest = {
    dataSet: Id[];
    dataElementGroup?: Id[];
    period?: string[];
    startDate?: string;
    endDate?: string;
    orgUnit: Id[];
    children?: boolean;
    orgUnitGroup?: Id[];
    attributeOptionCombo?: Id[];
    includeDeleted?: boolean;
    lastUpdated?: string;
    lastUpdatedDuration?: string;
    limit?: number;
    idScheme?: IdScheme;
    dataElementIdScheme?: IdScheme;
    orgUnitIdScheme?: IdScheme;
    categoryOptionComboIdScheme?: IdScheme;
    dataSetIdScheme?: IdScheme;
};

export interface DataValueSetsGetResponse {
    dataSet: Id;
    completeDate?: string;
    period: string;
    orgUnit: Id;
    dataValues: Array<DataValueSetsDataValue>;
}

export interface DataValueSetsDataValue {
    dataElement: Id;
    period: string;
    orgUnit: Id;
    categoryOptionCombo: Id;
    attributeOptionCombo: Id;
    value: string;
    comment: string;
    storedBy: string;
    created: string;
    lastUpdated: string;
    followup: boolean;
}

export class DataValues {
    constructor(public d2Api: D2ApiGeneric) {}

    getSet(params: DataValueSetsGetRequest): D2ApiResponse<DataValueSetsGetResponse> {
        return this.d2Api
            .get<DataValueSetsGetResponse>("/dataValueSets", params)
            .map(res => res.data);
    }

    postSet(
        params: DataValueSetsPostParams,
        request: DataValueSetsPostRequest
    ): D2ApiResponse<DataValueSetsPostResponse> {
        return this.d2Api.post<DataValueSetsPostResponse>(
            "/dataValueSets",
            { ...params, async: false },
            request
        );
    }

    postSetAsync(
        params: DataValueSetsPostParams,
        request: DataValueSetsPostRequest
    ): D2ApiResponse<AsyncPostResponse<"DATAVALUE_IMPORT">> {
        return this.d2Api.post<AsyncPostResponse<"DATAVALUE_IMPORT">>(
            "/dataValueSets",
            { ...params, async: true },
            request
        );
    }
}
