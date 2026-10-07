import { editableValueSchema, type EditableValue, type EntityId } from './content.js';
import { entityDefinitions } from './registry.js';
import legacyVisibleContentSeeds from '../seeds/legacy-visible-content.json' with { type: 'json' };
import { homeV2SeedData } from '../seeds/home.js';
import { propertyManagementV2SeedData } from '../seeds/property-management.js';
import { storageV2SeedData } from '../seeds/storage.js';
import { realEstateV2SeedData } from '../seeds/real-estate.js';
import { constructionV2SeedData } from '../seeds/construction.js';
import { developmentV2SeedData } from '../seeds/development.js';

const uncheckedSeedData: Readonly<Record<string, unknown>> = legacyVisibleContentSeeds;
const semanticHomeSeeds: Readonly<Record<string, EditableValue>> = homeV2SeedData;
const semanticPropertyManagementSeeds: Readonly<Record<string, EditableValue>> =
  propertyManagementV2SeedData;
const semanticStorageSeeds: Readonly<Record<string, EditableValue>> = storageV2SeedData;
const semanticRealEstateSeeds: Readonly<Record<string, EditableValue>> = realEstateV2SeedData;
const semanticConstructionSeeds: Readonly<Record<string, EditableValue>> = constructionV2SeedData;
const semanticDevelopmentSeeds: Readonly<Record<string, EditableValue>> = developmentV2SeedData;

export const registrySeedData: Readonly<Record<EntityId, EditableValue>> = Object.fromEntries(
  entityDefinitions.map((definition) => {
    const seed =
      semanticHomeSeeds[definition.id] ??
      semanticPropertyManagementSeeds[definition.id] ??
      semanticRealEstateSeeds[definition.id] ??
      semanticConstructionSeeds[definition.id] ??
      semanticStorageSeeds[definition.id] ??
      semanticDevelopmentSeeds[definition.id] ??
      uncheckedSeedData[definition.id];
    definition.schema.parse(seed);
    return [definition.id, editableValueSchema.parse(seed)] as const;
  }),
);
