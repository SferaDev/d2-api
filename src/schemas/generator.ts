import { joinPath } from "./../utils/connection";
import axios from "axios";
import path from "path";
import _ from "lodash";
import prettier from "prettier";
import fs from "fs";
import argparse from "argparse";

interface SchemaProperty {
    name: string;
    fieldName?: string;
    propertyType: string;
    itemPropertyType?: string;
    constants?: string[];
    klass: string;
    itemKlass?: string;
    persisted: boolean;
    owner: boolean;
}

interface Schema {
    klass: string;
    properties: SchemaProperty[];
    name: string;
    plural: string;
    metadata: boolean;
}

interface Schemas {
    [className: string]: Schema;
}

const interfaceFromClass: _.Dictionary<string> = {
    "org.hisp.dhis.security.acl.Access": "D2Access",
    "org.hisp.dhis.translation.Translation": "D2Translation",
    "org.hisp.dhis.common.ObjectStyle": "D2Style",
    "org.hisp.dhis.common.DimensionalKeywords": "D2DimensionalKeywords",
    "com.vividsolutions.jts.geom.Geometry": "D2Geometry",
    "org.hisp.dhis.expression.Expression": "D2Expression",
    "org.hisp.dhis.period.PeriodType": "string",
    "org.hisp.dhis.chart.Series": "any",
    "org.hisp.dhis.common.DataDimensionItem": "any",
    "org.hisp.dhis.common.DimensionalObject": "any",
    "org.hisp.dhis.interpretation.Mention": "any",
    "org.hisp.dhis.message.Message": "any",
    "org.hisp.dhis.message.UserMessage": "any",
    "org.hisp.dhis.period.Period": "any",
    "org.hisp.dhis.period.RelativePeriods": "any",
    "org.hisp.dhis.programstagefilter.EventQueryCriteria": "any",
    "org.hisp.dhis.relationship.RelationshipConstraint": "any",
    "org.hisp.dhis.relationship.RelationshipItem": "any",
    "org.hisp.dhis.render.DeviceRenderTypeMap": "any",
    "org.hisp.dhis.reporttable.ReportParams": "any",
    "org.hisp.dhis.sms.command.code.SMSCode": "any",
    "org.hisp.dhis.sms.command.SMSSpecialCharacter": "any",
    "org.hisp.dhis.trackedentityattributevalue.TrackedEntityAttributeValue": "any",
    "org.hisp.dhis.trackedentitycomment.TrackedEntityComment": "any",
    "org.hisp.dhis.trackedentityfilter.EventFilter": "any",
    "org.hisp.dhis.trackedentityfilter.FilterPeriod": "any",
    "org.hisp.dhis.trackedentity.TrackedEntityAttributeDimension": "any",
    "org.hisp.dhis.trackedentity.TrackedEntityProgramOwner": "any",
    "org.hisp.dhis.common.DimensionalItemObject": "any",

    "java.lang.Object": "object",
    "java.util.Map": "object",
};

function getModelName(klass: string, suffix?: string): string {
    const className = _.last(klass.split("."));
    if (!className) {
        throw "No class name";
    } else {
        return `D2${className}${suffix || ""}`;
    }
}

const getType = (schemas: Schemas, property: SchemaProperty): string => {
    const { propertyType, constants, itemPropertyType, itemKlass } = property;

    switch (propertyType) {
        case "REFERENCE":
            return getInterface(schemas, property);
        case "COLLECTION":
            if (!itemPropertyType || !itemKlass) throw new Error("Missing item info");

            const innerType = getType(schemas, {
                ...property,
                propertyType: itemPropertyType,
                klass: itemKlass,
            });
            return `${innerType}[]`;
        case "TEXT":
        case "URL":
        case "PHONENUMBER":
        case "EMAIL":
        case "COLOR":
        case "PASSWORD":
            return "string";
        case "DATE":
            return "Date";
        case "IDENTIFIER":
            return "Id";
        case "INTEGER":
            return "number";
        case "CONSTANT":
            return constants ? constants.map(constant => `"${constant}"`).join(" | ") : "never";
        case "COMPLEX":
            return getInterface(schemas, property);
        default:
            return propertyType.toLowerCase();
    }
};

function getInterface(schemas: Schemas, property: SchemaProperty): string {
    const className = _.last(property.klass.split(".")) || "";

    if (schemas[className]) {
        return `D2${className}`;
    } else if (interfaceFromClass[property.klass]) {
        return interfaceFromClass[property.klass];
    } else {
        console.log(`Unsupported complex type, default to any: ${property.klass}`);
        return "any";
    }
}

/*
function createInterface(name: string, properties: _.Dictionary<string>, parent?: string): string {
    const interfaceString = ["interface", name, parent ? `extends ${parent}` : ""].join(" ");
    const propertiesString = _(properties)
        .toPairs()
        .sortBy()
        .map(([key, value]) => `${key}: ${value}`)
        .join(";");

    return `export ${interfaceString} {
        ${propertiesString}
    }`;
}
*/

function getModelProperties(schemas: Schemas, schema: Schema): string {
    return _(schema.properties)
        .map(property => [
            (property.fieldName === "uid" ? "id" : property.fieldName) || property.name,
            getType(schemas, property, "Schema"),
        ])
        .sortBy()
        .map(([key, value]) => `${key}: ${value}`)
        .join(";");
}

function getArgsParser() {
    const parser = new argparse.ArgumentParser();
    parser.addArgument("url", {
        help: "DHIS2 instance URL: http://username:password@server:port",
    });

    return parser.parseArgs();
}

function quote(s: string): string {
    return '"' + s + '"';
}

function getPropertiesUnion(
    schema: Schema,
    predicate: (property: SchemaProperty) => boolean
): string {
    return (
        schema.properties
            .filter(predicate)
            .map(property => quote(property.fieldName || property.name))
            .join(" | ") || "never"
    );
}

/*
const presets = {
    identifiable: ["id", "name", "code", "created", "lastUpdated"],
    nameable: ["id", "name", "shortName", "code", "description", "created", "lastUpdated"],
};

function joinS(xs: string[]): string {
    return xs.map(quote).join(" | ");
}
*/

const start = async () => {
    const args = getArgsParser();
    const schemaUrl = joinPath(args.url, "/api/schemas.json?fields=:all,metadata");
    const { schemas } = (await axios.get(schemaUrl)).data as { schemas: Schema[] };
    const models = _(schemas)
        .filter(schema => schema.metadata)
        .value();
    const schemasByClassName = _.keyBy(schemas, schema => _.last(schema.klass.split(".")) || "");

    const modelsDeclaration = `
        import { Id, D2AccessSchema, D2TranslationSchema, D2GeometrySchema, Preset, FieldPresets,
                 D2StyleSchema, D2DimensionalKeywordsSchema, D2ExpressionSchema } from './base';

        ${schemas
            .map(
                schema => `
                export type ${getModelName(schema.klass, "Schema")} = {
                    ${getModelProperties(schemasByClassName, schema)}
                };
            `
            )
            .join("\n\n")}

            ${schemas
                .map(
                    schema => `
                    export type ${getModelName(schema.klass)} = {
                        ${getModelProperties(schemasByClassName, schema)}
                    };
                `
                )
                .join("\n\n")}

        ${schemas
            .map(schema => {
                const modelName = getModelName(schema.klass);

                return `
                    export interface ${modelName}Schema {
                        fields: ${modelName};
                        fieldPresets: {
                            $all:
                                Preset<${modelName}, keyof ${modelName}>
                            $identifiable:
                                Preset<${modelName}, FieldPresets["identifiable"]>
                            $nameable:
                                Preset<${modelName}, FieldPresets["nameable"]>
                            $persisted:
                                Preset<${modelName}, ${getPropertiesUnion(
                    schema,
                    p => p.persisted
                )}>
                            $owner:
                                Preset<${modelName}, ${getPropertiesUnion(schema, p => p.owner)}>
                        }
                    }
                `;
            })
            .join("\n\n")}

        export type D2Model =
            ${models.map(model => getModelName(model.klass)).join(" | ")}

        export enum D2ModelEnum {
            ${models.map(model => `${model.plural} = "${model.plural}"`).join(",\n")}
        }

        export type D2ModelSchemas = {
            ${models
                .map(model => `${model.plural}: ${getModelName(model.klass)}Schema`)
                .join(",\n")}
        }
    `;

    const parts = [modelsDeclaration];
    const prettierConfigFile = await prettier.resolveConfigFile();
    if (!prettierConfigFile) throw new Error("Cannot find prettier config file");

    /*
    const prettierConfig = await prettier.resolveConfig(prettierConfigFile);
    const data = prettier.format(parts.join("\n\n"), {
        parser: "babel",
        ...prettierConfig,
    });
    */
    const data = parts.join("\n\n");

    const tsPath = path.join(__dirname, "models.ts");
    fs.writeFile(tsPath, data, err => {
        if (err) console.error(err);
        else console.log(`Written: ${tsPath}`);
    });
};

start();